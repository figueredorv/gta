from __future__ import annotations

from pathlib import Path
from typing import Callable

from PySide6.QtCore import Qt
from PySide6.QtWidgets import (
    QFrame,
    QHBoxLayout,
    QLabel,
    QScrollArea,
    QVBoxLayout,
    QWidget,
)

from ..core.models import StoryPackage
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
        root.addStretch(1)

        scroll.setWidget(content)
        self.load_package(None)

    def load_package(self, pkg: StoryPackage | None) -> None:
        if pkg is None:
            self.story_id_badge.setText('—')
            self.subtitle_label.setText('')
            self.title_label.setText('Nenhuma história carregada')
            self.description_label.setText('Selecione ou crie uma história no topo para começar.')
            self.splash_preview.load_file(None)
            self.missions_card.set_metric(0, '0 encontros extras')
            self.characters_card.set_metric(0, 'Nenhum personagem')
            self.items_card.set_metric(0, '0 no catálogo')
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
