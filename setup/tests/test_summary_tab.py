import os
import tempfile
import unittest
from pathlib import Path

os.environ.setdefault('QT_QPA_PLATFORM', 'offscreen')

from PySide6.QtGui import QColor, QImage
from PySide6.QtWidgets import QApplication

from setup.core.models import (
    Character,
    ExtraItemPlacement,
    Item,
    Mission,
    StoryPackage,
)
from setup.ui.main_window import SetupMainWindow
from setup.ui.tab_summary import StorySummaryTab, count_used_items


class SummaryTabTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls._app = QApplication.instance() or QApplication([])

    def test_count_used_items_deduplicates_across_missions_and_collectibles(self) -> None:
        pkg = StoryPackage(
            id='demo',
            title='Demo',
            items={
                'key': Item(id='key', name='Chave'),
                'map': Item(id='map', name='Mapa'),
                'coin': Item(id='coin', name='Moeda'),
                'unused': Item(id='unused', name='Inutilizado'),
            },
            missions={
                'm1': Mission(
                    id='m1',
                    title='Missão 1',
                    start='A',
                    target='B',
                    objective='Entregar chave',
                    give_item='key',
                    require_item='key',
                    extra_items=[ExtraItemPlacement(item_id='map', location='C')],
                ),
            },
            collectibles=[
                ExtraItemPlacement(item_id='coin', location='D'),
                ExtraItemPlacement(item_id='map', location='E'),
            ],
        )
        used, total = count_used_items(pkg)
        self.assertEqual(used, 3)
        self.assertEqual(total, 4)
        self.assertEqual(count_used_items(None), (0, 0))

    def test_summary_tab_displays_story_overview_and_handles_empty_state(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            story_dir = Path(tmp)
            splash = story_dir / 'splash.png'
            img = QImage(160, 90, QImage.Format.Format_ARGB32)
            img.fill(QColor('#f59e0b'))
            self.assertTrue(img.save(str(splash)))

            tab = StorySummaryTab(lambda: story_dir)
            pkg = StoryPackage(
                id='cidade-nova',
                title='Cidade Nova',
                subtitle='Edição Especial',
                body_description='Uma história de teste no mundo aberto.',
                protagonist='leo',
                splash='splash.png',
                characters_order=['leo', 'bia'],
                characters={
                    'leo': Character(id='leo', name='Léo', profile='Protagonista'),
                    'bia': Character(id='bia', name='Bia', profile='Aliada'),
                },
                items={'pen': Item(id='pen', name='Pendrive'), 'caf': Item(id='caf', name='Café')},
                missions_order=['01'],
                missions={
                    '01': Mission(id='01', title='Primeiro Contato', start='RUA-01', target='COM-02', objective='Falar com Bia', give_item='pen'),
                },
            )
            tab.load_package(pkg)

            self.assertEqual(tab.title_label.text(), 'Cidade Nova')
            self.assertEqual(tab.description_label.text(), 'Uma história de teste no mundo aberto.')
            self.assertTrue(tab.splash_preview._has_valid_image)
            self.assertTrue(tab.splash_preview._enable_zoom)
            self.assertEqual(tab.missions_card.value_label.text(), '1')
            self.assertEqual(tab.characters_card.value_label.text(), '2')
            self.assertEqual(tab.items_card.value_label.text(), '1')
            self.assertIn('de 2', tab.items_card.sub_label.text())

            tab.load_package(None)
            self.assertEqual(tab.title_label.text(), 'Nenhuma história carregada')
            self.assertFalse(tab.splash_preview._has_valid_image)
            self.assertEqual(tab.items_card.value_label.text(), '0')

    def test_main_window_opens_resumo_by_default_and_on_story_reload(self) -> None:
        app_root = Path(__file__).resolve().parents[2]
        win = SetupMainWindow(app_root)
        try:
            self.assertEqual(win.tabs.tabText(0), 'Resumo')
            self.assertEqual(win.tabs.tabText(1), 'História')
            self.assertEqual(win.tabs.currentIndex(), 0)

            # Muda para outra aba e recarrega a história: deve voltar para Resumo
            win.tabs.setCurrentIndex(2)
            self.assertEqual(win.tabs.currentIndex(), 2)
            if win._pkg is not None:
                win._load_story(win._pkg.id)
                self.assertEqual(win.tabs.currentIndex(), 0)

                # Edita título na aba História e retorna para Resumo: deve refletir
                win.tabs.setCurrentWidget(win.tab_story)
                win.tab_story.title_edit.setText('Título Atualizado Teste')
                win.tabs.setCurrentWidget(win.tab_summary)
                self.assertEqual(win.tab_summary.title_label.text(), 'Título Atualizado Teste')
        finally:
            win.close()


if __name__ == '__main__':
    unittest.main()
