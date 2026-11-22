from __future__ import annotations

from pathlib import Path
from typing import Callable

from PySide6.QtWidgets import (
    QDialog,
    QFileDialog,
    QFormLayout,
    QGroupBox,
    QHBoxLayout,
    QLineEdit,
    QMessageBox,
    QPlainTextEdit,
    QPushButton,
    QScrollArea,
    QSizePolicy,
    QTabWidget,
    QVBoxLayout,
    QWidget,
)

from ..core.models import StoryPackage
from ..core.story_io import StoryIOError, apply_story_favicon, find_story_favicon
from .character_picker import CharacterPickerDialog
from .extra_items_widget import ExtraItemsGroupWidget
from .widgets import AssetPickerRow, AssetPreviewWidget


class StoryMetadataTab(QWidget):
    """Aba de metadados gerais e imagens de abertura/encerramento da história."""

    def __init__(
        self,
        story_dir_provider: Callable[[], Path | None],
        app_root: Path | None = None,
        pkg_provider: Callable[[], StoryPackage | None] | None = None,
        on_data_changed: Callable[[], None] | None = None,
        on_favicon_changed: Callable[[], None] | None = None,
        parent: QWidget | None = None,
    ) -> None:
        super().__init__(parent)
        self._story_dir_provider = story_dir_provider
        self._app_root = app_root
        self._pkg_provider = pkg_provider
        self._on_data_changed = on_data_changed
        self._on_favicon_changed = on_favicon_changed
        self._pkg: StoryPackage | None = None
        self._protagonist_id: str = ''

        root = QVBoxLayout(self)
        self.subtabs = QTabWidget()
        root.addWidget(self.subtabs)

        # Sub-aba 1: Identidade
        identity_scroll = QScrollArea()
        identity_scroll.setWidgetResizable(True)
        identity_page = QWidget()
        identity_layout = QVBoxLayout(identity_page)
        identity_layout.setSpacing(12)

        info_group = QGroupBox('Identidade da História')
        form = QFormLayout(info_group)
        form.setSpacing(10)
        form.setFieldGrowthPolicy(QFormLayout.FieldGrowthPolicy.ExpandingFieldsGrow)

        self.id_edit = QLineEdit()
        self.id_edit.setReadOnly(True)
        self.title_edit = QLineEdit()
        self.page_title_edit = QLineEdit()
        self.subtitle_edit = QLineEdit()
        self.protagonist_edit = QLineEdit()
        self.protagonist_edit.setReadOnly(True)
        self.protagonist_edit.setPlaceholderText('(padrão — 1º personagem)')
        self.protagonist_pick_btn = QPushButton('Escolher...')
        self.protagonist_pick_btn.clicked.connect(self._on_pick_protagonist)
        self.protagonist_clear_btn = QPushButton('Limpar')
        self.protagonist_clear_btn.clicked.connect(self._on_clear_protagonist)
        protagonist_row = QHBoxLayout()
        protagonist_row.setContentsMargins(0, 0, 0, 0)
        protagonist_row.setSpacing(6)
        protagonist_row.addWidget(self.protagonist_edit, 1)
        protagonist_row.addWidget(self.protagonist_pick_btn)
        protagonist_row.addWidget(self.protagonist_clear_btn)

        self.desc_edit = QPlainTextEdit()
        self.desc_edit.setMinimumHeight(110)
        self.desc_edit.setMaximumHeight(160)
        for widget in (
            self.id_edit,
            self.title_edit,
            self.page_title_edit,
            self.subtitle_edit,
            self.protagonist_edit,
            self.desc_edit,
        ):
            widget.setSizePolicy(QSizePolicy.Policy.Expanding, widget.sizePolicy().verticalPolicy())

        self.splash_picker = AssetPickerRow(story_dir_provider, subdir='splash')
        self.splash_end_picker = AssetPickerRow(story_dir_provider, subdir='splash', allow_clear=True)

        favicon_row = QHBoxLayout()
        favicon_row.setSpacing(8)
        self.favicon_preview = AssetPreviewWidget(48, parent=self, enable_zoom=True)
        self.favicon_edit = QLineEdit()
        self.favicon_edit.setReadOnly(True)
        self.favicon_edit.setPlaceholderText('Nenhum favicon na raiz')
        self.favicon_btn = QPushButton('Alterar...')
        self.favicon_btn.clicked.connect(self._on_change_favicon)
        favicon_row.addWidget(self.favicon_preview)
        favicon_row.addWidget(self.favicon_edit, 1)
        favicon_row.addWidget(self.favicon_btn)

        form.addRow('Identificador:', self.id_edit)
        form.addRow('Título no jogo:', self.title_edit)
        form.addRow('Título da aba:', self.page_title_edit)
        form.addRow('Subtítulo:', self.subtitle_edit)
        form.addRow('Protagonista:', protagonist_row)
        form.addRow('Descrição:', self.desc_edit)
        form.addRow('Favicon (.svg / .png):', favicon_row)
        form.addRow('Imagem de abertura:', self.splash_picker)
        form.addRow('Imagem de fim:', self.splash_end_picker)

        identity_layout.addWidget(info_group)
        identity_layout.addStretch(1)
        identity_scroll.setWidget(identity_page)
        self.subtabs.addTab(identity_scroll, 'Identidade')

        # Sub-aba 2: Colecionáveis
        self.collectibles_editor: ExtraItemsGroupWidget | None = None
        if app_root is not None and pkg_provider is not None:
            collectibles_scroll = QScrollArea()
            collectibles_scroll.setWidgetResizable(True)
            collectibles_page = QWidget()
            collectibles_layout = QVBoxLayout(collectibles_page)
            collectibles_layout.setSpacing(12)
            self.collectibles_editor = ExtraItemsGroupWidget(
                'Colecionáveis Globais (story.md)',
                app_root,
                pkg_provider,
                on_changed=on_data_changed,
            )
            collectibles_layout.addWidget(self.collectibles_editor)
            collectibles_layout.addStretch(1)
            collectibles_scroll.setWidget(collectibles_page)
            self.subtabs.addTab(collectibles_scroll, 'Colecionáveis')

        self.title_edit.textChanged.connect(self._sync)
        self.page_title_edit.textChanged.connect(self._sync)
        self.subtitle_edit.textChanged.connect(self._sync)
        self.desc_edit.textChanged.connect(self._sync)

    def _set_protagonist_display(self, pkg: StoryPackage | None, char_id: str) -> None:
        self._protagonist_id = (char_id or '').strip()
        if not self._protagonist_id:
            self.protagonist_edit.clear()
            return
        char = pkg.characters.get(self._protagonist_id) if pkg else None
        self.protagonist_edit.setText(
            f'{char.name} ({self._protagonist_id})' if char else self._protagonist_id
        )

    def _on_pick_protagonist(self) -> None:
        if not self._pkg or not self._app_root:
            return
        dlg = CharacterPickerDialog(
            self._app_root,
            self._pkg,
            current_char_id=self._protagonist_id,
            parent=self,
        )
        if dlg.exec() == QDialog.DialogCode.Accepted and dlg.selected_char_id:
            self._set_protagonist_display(self._pkg, dlg.selected_char_id)
            self._sync()
            if self._on_data_changed:
                self._on_data_changed()

    def _on_clear_protagonist(self) -> None:
        if not self._pkg:
            return
        self._set_protagonist_display(self._pkg, '')
        self._sync()
        if self._on_data_changed:
            self._on_data_changed()

    def load_package(self, pkg: StoryPackage | None) -> None:
        self._pkg = None
        if not pkg:
            self.id_edit.clear()
            self.title_edit.clear()
            self.page_title_edit.clear()
            self.subtitle_edit.clear()
            self._set_protagonist_display(None, '')
            self.protagonist_pick_btn.setEnabled(False)
            self.protagonist_clear_btn.setEnabled(False)
            self.desc_edit.clear()
            self.splash_picker.set_value('')
            self.splash_end_picker.set_value('')
            self.favicon_preview.load_file(None)
            self.favicon_edit.clear()
            self.favicon_btn.setEnabled(False)
            if self.collectibles_editor:
                self.collectibles_editor.load_placements([])
            return

        self.id_edit.setText(pkg.id)
        self.title_edit.setText(pkg.title)
        self.page_title_edit.setText(pkg.page_title)
        self.subtitle_edit.setText(pkg.subtitle)
        self._set_protagonist_display(pkg, pkg.protagonist)
        self.protagonist_pick_btn.setEnabled(bool(self._app_root))
        self.protagonist_clear_btn.setEnabled(True)
        self.desc_edit.setPlainText(pkg.body_description)
        self.splash_picker.set_value(pkg.splash)
        self.splash_end_picker.set_value(pkg.splash_end)
        self.favicon_btn.setEnabled(True)
        self._refresh_favicon()
        if self.collectibles_editor:
            self.collectibles_editor.load_placements(pkg.collectibles)
        self._pkg = pkg

    def refresh_reference_choices(self) -> None:
        if self._pkg:
            self._set_protagonist_display(self._pkg, self._pkg.protagonist)
        if self.collectibles_editor and self._pkg:
            self.collectibles_editor.load_placements(self._pkg.collectibles)

    def _refresh_favicon(self) -> None:
        story_dir = self._story_dir_provider()
        fav = find_story_favicon(story_dir) if story_dir else None
        self.favicon_preview.load_file(fav)
        self.favicon_edit.setText(fav.name if fav else '')

    def _on_change_favicon(self) -> None:
        story_dir = self._story_dir_provider()
        if not story_dir:
            return
        file_path, _ = QFileDialog.getOpenFileName(
            self,
            'Alterar Favicon (.svg ou .png)',
            str(story_dir),
            'Ícones (*.svg *.png)',
        )
        if not file_path:
            return
        try:
            apply_story_favicon(story_dir, Path(file_path))
        except StoryIOError as err:
            QMessageBox.warning(self, 'Erro ao alterar favicon', str(err))
            return
        self._refresh_favicon()
        if self._on_favicon_changed:
            self._on_favicon_changed()

    def flush(self) -> None:
        self._sync()

    def _sync(self) -> None:
        if not self._pkg:
            return
        self._pkg.title = self.title_edit.text().strip()
        self._pkg.page_title = self.page_title_edit.text().strip()
        self._pkg.subtitle = self.subtitle_edit.text().strip()
        self._pkg.protagonist = self._protagonist_id
        self._pkg.body_description = self.desc_edit.toPlainText().strip()
        self._pkg.splash = self.splash_picker.value() or 'splash/splash-start.png'
        self._pkg.splash_end = self.splash_end_picker.value() or 'splash/splash-end.png'
