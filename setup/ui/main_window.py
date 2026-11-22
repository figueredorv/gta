from __future__ import annotations

from pathlib import Path
import webbrowser

from PySide6.QtWidgets import (
    QComboBox,
    QFrame,
    QHBoxLayout,
    QInputDialog,
    QLabel,
    QMainWindow,
    QMessageBox,
    QPushButton,
    QStatusBar,
    QTabWidget,
    QVBoxLayout,
    QWidget,
)

from ..core.models import StoryPackage
from ..core.story_io import (
    StoryIOError,
    create_story,
    delete_story,
    load_catalog,
    load_story_package,
    save_story_package,
)
from ..core.validator import validate_story
from .new_story_dialog import NewStoryDialog
from .tab_characters import CharactersTab
from .tab_items import ItemsTab
from .tab_map import MapLocationsTab
from .tab_missions import MissionsAndEncountersTab
from .tab_summary import StorySummaryTab
from .tab_story import StoryMetadataTab
from .widgets import LocalPreviewServer


class SetupMainWindow(QMainWindow):
    """Janela principal do editor desktop local de histórias."""

    def __init__(self, app_root: Path) -> None:
        super().__init__()
        self.app_root = app_root
        self._pkg: StoryPackage | None = None
        self._dirty = False
        self._suppress_story_change = False
        self._preview_server = LocalPreviewServer(app_root)

        self.setWindowTitle('Setup — Editor de Histórias')
        self.resize(1120, 740)

        central = QWidget()
        self.setCentralWidget(central)
        root_layout = QVBoxLayout(central)
        root_layout.setContentsMargins(12, 12, 12, 12)
        root_layout.setSpacing(10)

        # Barra superior
        top_bar = QFrame()
        top_bar.setObjectName('TopBar')
        top_layout = QHBoxLayout(top_bar)
        top_layout.setContentsMargins(12, 10, 12, 10)
        top_layout.setSpacing(8)

        brand = QLabel('SETUP // HISTÓRIAS')
        brand.setStyleSheet('font-size: 15px; font-weight: 800; color: #f59e0b; letter-spacing: 1px;')
        top_layout.addWidget(brand)

        self.story_combo = QComboBox()
        self.story_combo.setMinimumWidth(240)
        self.story_combo.currentIndexChanged.connect(self._on_story_changed)
        top_layout.addWidget(self.story_combo)

        self.new_story_btn = QPushButton('+ Nova História')
        self.new_story_btn.clicked.connect(self._on_new_story)
        self.del_story_btn = QPushButton('Excluir')
        self.del_story_btn.setObjectName('DangerButton')
        self.del_story_btn.clicked.connect(self._on_delete_story)

        self.save_btn = QPushButton('Salvar História')
        self.save_btn.setObjectName('PrimaryButton')
        self.save_btn.clicked.connect(self._on_save)

        self.test_btn = QPushButton('Testar no Navegador')
        self.test_btn.clicked.connect(self._on_test_browser)

        top_layout.addWidget(self.new_story_btn)
        top_layout.addWidget(self.del_story_btn)
        top_layout.addStretch(1)
        top_layout.addWidget(self.save_btn)
        top_layout.addWidget(self.test_btn)
        root_layout.addWidget(top_bar)

        # Abas principais
        self.tabs = QTabWidget()
        self.tab_summary = StorySummaryTab(self._current_story_dir)
        self.tab_story = StoryMetadataTab(
            self._current_story_dir,
            app_root=self.app_root,
            pkg_provider=lambda: self._pkg,
            on_data_changed=self._mark_dirty,
        )
        self.tab_characters = CharactersTab(self._current_story_dir, on_data_changed=self._on_refs_changed)
        self.tab_items = ItemsTab(self.app_root, self._current_story_dir, on_data_changed=self._on_refs_changed)
        self.tab_missions = MissionsAndEncountersTab(self.app_root, on_data_changed=self._mark_dirty)
        self.tab_map = MapLocationsTab(self.app_root, self._current_story_dir, on_data_changed=self._mark_dirty)

        self.tabs.addTab(self.tab_summary, 'Resumo')
        self.tabs.addTab(self.tab_story, 'História')
        self.tabs.addTab(self.tab_characters, 'Personagens')
        self.tabs.addTab(self.tab_items, 'Itens')
        self.tabs.addTab(self.tab_missions, 'Missões')
        self.tabs.addTab(self.tab_map, 'Mapa')
        self.tabs.currentChanged.connect(self._on_tab_changed)
        self.tab_summary.navigate_requested.connect(self._on_summary_navigate)
        root_layout.addWidget(self.tabs, 1)

        self.setStatusBar(QStatusBar())
        self._reload_catalog()

    def _current_story_dir(self) -> Path | None:
        if not self._pkg:
            return None
        return self.app_root / 'story' / self._pkg.id

    def _mark_dirty(self) -> None:
        self._dirty = True
        if self._pkg:
            self.statusBar().showMessage(f'História "{self._pkg.id}" com alterações não salvas.')

    def _on_refs_changed(self) -> None:
        self.tab_story.refresh_reference_choices()
        self.tab_missions.refresh_reference_choices()
        self._mark_dirty()

    def _reload_catalog(self, select_id: str | None = None) -> None:
        self._suppress_story_change = True
        self.story_combo.clear()
        entries = load_catalog(self.app_root)
        target_idx = 0
        for idx, entry in enumerate(entries):
            self.story_combo.addItem(f'{entry.title} ({entry.id})', entry.id)
            if select_id and entry.id == select_id:
                target_idx = idx
        self._suppress_story_change = False
        if entries:
            self.story_combo.setCurrentIndex(target_idx)
            self._load_story(entries[target_idx].id)
        else:
            self._load_story(None)

    def _on_story_changed(self, index: int) -> None:
        if self._suppress_story_change or index < 0:
            return
        story_id = self.story_combo.itemData(index)
        if story_id:
            self._load_story(str(story_id))

    def _on_tab_changed(self, index: int) -> None:
        if self.tabs.widget(index) is self.tab_summary:
            self.tab_summary.load_package(self._pkg)

    def _on_summary_navigate(self, target: str) -> None:
        mapping = {
            'missions': self.tab_missions,
            'characters': self.tab_characters,
            'items': self.tab_items,
        }
        widget = mapping.get(target)
        if widget is not None:
            self.tabs.setCurrentWidget(widget)

    def _load_story(self, story_id: str | None) -> None:
        if not story_id:
            self._pkg = None
            for tab in (
                self.tab_summary,
                self.tab_story,
                self.tab_characters,
                self.tab_items,
                self.tab_missions,
                self.tab_map,
            ):
                tab.load_package(None)
            self.tabs.setCurrentWidget(self.tab_summary)
            self.statusBar().showMessage('Nenhuma história carregada.')
            return
        try:
            self._pkg = load_story_package(self.app_root, story_id)
        except StoryIOError as err:
            QMessageBox.critical(self, 'Erro ao carregar história', str(err))
            return
        self.tab_summary.load_package(self._pkg)
        self.tab_story.load_package(self._pkg)
        self.tab_characters.load_package(self._pkg)
        self.tab_items.load_package(self._pkg)
        self.tab_missions.load_package(self._pkg)
        self.tab_map.load_package(self._pkg)
        self.tabs.setCurrentWidget(self.tab_summary)
        self._dirty = False
        self.statusBar().showMessage(f'História "{self._pkg.title}" ({self._pkg.id}) carregada.')

    def _on_new_story(self) -> None:
        dlg = NewStoryDialog(self.app_root, parent=self)
        if dlg.exec() != dlg.DialogCode.Accepted:
            return
        try:
            pkg = create_story(
                self.app_root,
                dlg.story_id(),
                dlg.story_title(),
            )
        except StoryIOError as err:
            QMessageBox.warning(self, 'Não foi possível criar', str(err))
            return
        self._reload_catalog(select_id=pkg.id)
        self.statusBar().showMessage(f'História "{pkg.title}" criada e pronta para edição.')

    def _on_delete_story(self) -> None:
        if not self._pkg:
            return
        entries = load_catalog(self.app_root)
        if len(entries) <= 1:
            QMessageBox.warning(self, 'Exclusão bloqueada', 'É necessário manter ao menos 1 história no catálogo.')
            return
        reply = QMessageBox.question(
            self,
            'Confirmar exclusão',
            f'Deseja realmente excluir a história "{self._pkg.title}" ({self._pkg.id})?\nEssa ação remove a pasta da história.',
            QMessageBox.StandardButton.Yes | QMessageBox.StandardButton.No,
            QMessageBox.StandardButton.No,
        )
        if reply != QMessageBox.StandardButton.Yes:
            return
        delete_story(self.app_root, self._pkg.id)
        self._reload_catalog()
        self.statusBar().showMessage('História excluída do catálogo.')

    def _save_current_if_valid(self) -> bool:
        if not self._pkg:
            return False
        self.tab_story.flush()
        errors = validate_story(self._pkg, self.app_root)
        if errors:
            QMessageBox.warning(
                self,
                'Pendências de integridade',
                'Corrija os problemas abaixo antes de salvar:\n\n• ' + '\n• '.join(errors[:20]),
            )
            return False
        try:
            save_story_package(self.app_root, self._pkg)
        except OSError as err:
            QMessageBox.critical(self, 'Erro ao salvar', str(err))
            return False
        self._dirty = False
        self._reload_catalog(select_id=self._pkg.id)
        self.statusBar().showMessage(f'História "{self._pkg.title}" salva com sucesso!')
        return True

    def _on_save(self) -> None:
        self._save_current_if_valid()

    def _on_test_browser(self) -> None:
        if not self._pkg:
            return
        if not self._save_current_if_valid():
            return
        port = self._preview_server.ensure_running()
        url = f'http://127.0.0.1:{port}/?story={self._pkg.id}'
        webbrowser.open(url)
        self.statusBar().showMessage(f'Abrindo jogo em {url}')

    def closeEvent(self, event: object) -> None:
        self._preview_server.stop()
        super().closeEvent(event)  # type: ignore[arg-type]
