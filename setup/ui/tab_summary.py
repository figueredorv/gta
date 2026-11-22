from __future__ import annotations

from pathlib import Path
from typing import Callable

from PySide6.QtCore import QSize, Qt
from PySide6.QtGui import QIcon, QPixmap
from PySide6.QtWidgets import (
    QAbstractItemView,
    QFrame,
    QGroupBox,
    QHBoxLayout,
    QLabel,
    QListWidget,
    QListWidgetItem,
    QScrollArea,
    QVBoxLayout,
    QWidget,
)

from ..core.models import Character, StoryPackage
from .widgets import AssetPreviewWidget


def count_used_items(pkg: StoryPackage | None) -> tuple[int, int]:
    """Retorna (itens distintos usados na história, total de itens no catálogo)."""
    if pkg is None:
        return 0, 0
    used_ids: set[str] = set()
    for mission in pkg.missions.values():
        if mission.give_item.strip():
            used_ids.add(mission.give_item.strip())
        if mission.require_item.strip():
            used_ids.add(mission.require_item.strip())
        for extra in mission.extra_items:
            if extra.item_id.strip():
                used_ids.add(extra.item_id.strip())
    for collectible in pkg.collectibles:
        if collectible.item_id.strip():
            used_ids.add(collectible.item_id.strip())
    return len(used_ids), len(pkg.items)


class _MetricCard(QFrame):
    """Card compacto de indicador numérico na aba Resumo."""

    def __init__(self, label: str, parent: QWidget | None = None) -> None:
        super().__init__(parent)
        self.setObjectName('SummaryMetricCard')
        self.setStyleSheet(
            'QFrame#SummaryMetricCard {'
            '  background-color: #1c212e;'
            '  border: 1px solid #2b3245;'
            '  border-radius: 8px;'
            '  padding: 10px 14px;'
            '}'
        )
        layout = QVBoxLayout(self)
        layout.setContentsMargins(12, 10, 12, 10)
        layout.setSpacing(2)

        self.value_label = QLabel('0', self)
        self.value_label.setStyleSheet('font-size: 24px; font-weight: 700; color: #f59e0b; background: transparent;')
        self.title_label = QLabel(label, self)
        self.title_label.setStyleSheet('font-size: 13px; font-weight: 600; color: #f4f5f7; background: transparent;')
        self.sub_label = QLabel('', self)
        self.sub_label.setStyleSheet('font-size: 11px; color: #9ca3af; background: transparent;')

        layout.addWidget(self.value_label)
        layout.addWidget(self.title_label)
        layout.addWidget(self.sub_label)

    def set_metric(self, value: int, subtitle: str) -> None:
        self.value_label.setText(str(value))
        self.sub_label.setText(subtitle)


class StorySummaryTab(QWidget):
    """Aba inicial de visão geral da história carregada."""

    def __init__(
        self,
        story_dir_provider: Callable[[], Path | None],
        parent: QWidget | None = None,
    ) -> None:
        super().__init__(parent)
        self._story_dir_provider = story_dir_provider

        outer = QVBoxLayout(self)
        outer.setContentsMargins(0, 0, 0, 0)

        scroll = QScrollArea(self)
        scroll.setWidgetResizable(True)
        scroll.setFrameShape(QFrame.Shape.NoFrame)
        outer.addWidget(scroll)

        content = QWidget()
        root = QVBoxLayout(content)
        root.setContentsMargins(12, 12, 12, 12)
        root.setSpacing(14)

        # Hero Card: Splash + Título + Descrição
        hero = QFrame(content)
        hero.setObjectName('SummaryHeroCard')
        hero.setStyleSheet(
            'QFrame#SummaryHeroCard {'
            '  background-color: #1c212e;'
            '  border: 1px solid #2b3245;'
            '  border-radius: 10px;'
            '}'
        )
        hero_layout = QHBoxLayout(hero)
        hero_layout.setContentsMargins(16, 16, 16, 16)
        hero_layout.setSpacing(18)

        self.splash_preview = AssetPreviewWidget(156, parent=hero, enable_zoom=True)
        hero_layout.addWidget(self.splash_preview, 0, Qt.AlignmentFlag.AlignTop)

        hero_text = QVBoxLayout()
        hero_text.setSpacing(6)

        meta_row = QHBoxLayout()
        meta_row.setSpacing(8)
        self.story_id_badge = QLabel('—', hero)
        self.story_id_badge.setStyleSheet(
            'background-color: #0e1015;'
            'color: #f59e0b;'
            'border: 1px solid #2b3245;'
            'border-radius: 5px;'
            'padding: 2px 8px;'
            'font-size: 11px;'
            'font-weight: 700;'
        )
        self.subtitle_label = QLabel('', hero)
        self.subtitle_label.setStyleSheet('color: #9ca3af; font-size: 12px; background: transparent;')
        meta_row.addWidget(self.story_id_badge, 0)
        meta_row.addWidget(self.subtitle_label, 1)
        hero_text.addLayout(meta_row)

        self.title_label = QLabel('Nenhuma história carregada', hero)
        self.title_label.setWordWrap(True)
        self.title_label.setStyleSheet('font-size: 22px; font-weight: 700; color: #f4f5f7; background: transparent;')
        hero_text.addWidget(self.title_label)

        self.description_label = QLabel('Selecione ou crie uma história no topo para começar.', hero)
        self.description_label.setWordWrap(True)
        self.description_label.setStyleSheet('font-size: 13px; color: #d1d5db; line-height: 1.4; background: transparent;')
        hero_text.addWidget(self.description_label)
        hero_text.addStretch(1)

        hero_layout.addLayout(hero_text, 1)
        root.addWidget(hero)

        # Faixa de Métricas
        metrics_row = QHBoxLayout()
        metrics_row.setSpacing(12)
        self.missions_card = _MetricCard('Missões', content)
        self.characters_card = _MetricCard('Personagens', content)
        self.items_card = _MetricCard('Itens usados na história', content)
        metrics_row.addWidget(self.missions_card, 1)
        metrics_row.addWidget(self.characters_card, 1)
        metrics_row.addWidget(self.items_card, 1)
        root.addLayout(metrics_row)

        # Colunas de Listas: Missões e Personagens
        lists_row = QHBoxLayout()
        lists_row.setSpacing(12)

        missions_group = QGroupBox('Missões da História', content)
        missions_layout = QVBoxLayout(missions_group)
        self.missions_list = QListWidget(missions_group)
        self.missions_list.setSelectionMode(QAbstractItemView.SelectionMode.NoSelection)
        self.missions_list.setFocusPolicy(Qt.FocusPolicy.NoFocus)
        self.missions_list.setMinimumHeight(220)
        missions_layout.addWidget(self.missions_list)

        chars_group = QGroupBox('Personagens', content)
        chars_layout = QVBoxLayout(chars_group)
        self.characters_list = QListWidget(chars_group)
        self.characters_list.setSelectionMode(QAbstractItemView.SelectionMode.NoSelection)
        self.characters_list.setFocusPolicy(Qt.FocusPolicy.NoFocus)
        self.characters_list.setIconSize(QSize(28, 28))
        self.characters_list.setMinimumHeight(220)
        chars_layout.addWidget(self.characters_list)

        lists_row.addWidget(missions_group, 1)
        lists_row.addWidget(chars_group, 1)
        root.addLayout(lists_row, 1)

        scroll.setWidget(content)
        self.load_package(None)

    def _character_icon(self, story_dir: Path | None, char: Character) -> QIcon:
        if not story_dir:
            return QIcon()
        for rel in (char.sprite_front, char.sprite_top, char.sprite_cutscene, char.sprite_left, char.sprite_right):
            if not rel:
                continue
            path = story_dir / rel
            if path.is_file():
                pix = QPixmap(str(path))
                if not pix.isNull():
                    return QIcon(
                        pix.scaled(
                            28,
                            28,
                            Qt.AspectRatioMode.KeepAspectRatio,
                            Qt.TransformationMode.SmoothTransformation,
                        )
                    )
        return QIcon()

    def load_package(self, pkg: StoryPackage | None) -> None:
        self.missions_list.clear()
        self.characters_list.clear()

        if pkg is None:
            self.story_id_badge.setText('—')
            self.subtitle_label.setText('')
            self.title_label.setText('Nenhuma história carregada')
            self.description_label.setText('Selecione ou crie uma história no topo para começar.')
            self.splash_preview.load_file(None)
            self.missions_card.set_metric(0, '0 encontros extras')
            self.characters_card.set_metric(0, 'Nenhum personagem')
            self.items_card.set_metric(0, '0 no catálogo')
            self.missions_list.addItem('Nenhuma história carregada.')
            self.characters_list.addItem('Nenhuma história carregada.')
            return

        story_dir = self._story_dir_provider()
        splash_path = (story_dir / pkg.splash) if (story_dir and pkg.splash) else None
        self.splash_preview.load_file(splash_path)

        self.story_id_badge.setText(pkg.id or 'sem-id')
        self.subtitle_label.setText(pkg.subtitle or '')
        self.title_label.setText(pkg.title or pkg.id or 'História sem título')
        desc = pkg.body_description.strip()
        self.description_label.setText(desc if desc else 'Nenhuma descrição cadastrada.')

        encounters_count = len(pkg.encounters)
        encounters_label = (
            f'{encounters_count} encontro extra'
            if encounters_count == 1
            else f'{encounters_count} encontros extras'
        )
        self.missions_card.set_metric(len(pkg.missions), encounters_label)

        protagonist = pkg.protagonist.strip()
        char_sub = f'Protagonista: {protagonist}' if protagonist else 'Sem protagonista definido'
        self.characters_card.set_metric(len(pkg.characters), char_sub)

        used_count, total_count = count_used_items(pkg)
        self.items_card.set_metric(used_count, f'de {total_count} no catálogo')

        ordered_missions = [pkg.missions[mid] for mid in pkg.missions_order if mid in pkg.missions]
        for mid, mission in pkg.missions.items():
            if mid not in pkg.missions_order:
                ordered_missions.append(mission)

        if ordered_missions:
            for idx, mission in enumerate(ordered_missions, start=1):
                title = mission.title.strip() or mission.id
                route = f'{mission.start} → {mission.target}' if (mission.start or mission.target) else ''
                detail = mission.objective.strip() or route
                text = f'{idx:02d}. {title}'
                if detail:
                    text = f'{text}  —  {detail}'
                self.missions_list.addItem(QListWidgetItem(text))
        else:
            self.missions_list.addItem('Nenhuma missão cadastrada ainda.')

        ordered_chars = [pkg.characters[cid] for cid in pkg.characters_order if cid in pkg.characters]
        for cid, char in pkg.characters.items():
            if cid not in pkg.characters_order:
                ordered_chars.append(char)

        if ordered_chars:
            for char in ordered_chars:
                name = char.name.strip() or char.id
                detail = char.profile.strip() or char.traits.strip()
                text = f'{name} ({char.id})'
                if detail:
                    text = f'{text}  —  {detail}'
                icon = self._character_icon(story_dir, char)
                self.characters_list.addItem(QListWidgetItem(icon, text))
        else:
            self.characters_list.addItem('Nenhum personagem cadastrado ainda.')
