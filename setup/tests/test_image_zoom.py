import os
import tempfile
import unittest
from pathlib import Path

os.environ.setdefault('QT_QPA_PLATFORM', 'offscreen')

from PySide6.QtCore import QPoint, QSize, Qt
from PySide6.QtGui import QColor, QImage
from PySide6.QtTest import QTest
from PySide6.QtWidgets import QApplication, QMainWindow, QWidget

from setup.ui.tab_characters import CharactersTab
from setup.ui.tab_items import ItemsTab
from setup.ui.tab_map import MapLocationsTab
from setup.ui.tab_story import StoryMetadataTab
from setup.ui.widgets import AssetPickerRow, AssetPreviewWidget, compute_zoom_target_size


class ImageZoomTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls._app = QApplication.instance() or QApplication([])

    def test_compute_zoom_target_size_preserves_aspect_ratio(self) -> None:
        self.assertEqual(compute_zoom_target_size(QSize(32, 32), QSize(800, 600)), QSize(320, 320))
        self.assertEqual(compute_zoom_target_size(QSize(64, 32), QSize(800, 600)), QSize(320, 160))
        self.assertEqual(compute_zoom_target_size(QSize(500, 250), QSize(800, 600)), QSize(500, 250))
        self.assertEqual(compute_zoom_target_size(QSize(1920, 1080), QSize(800, 600)), QSize(800, 450))

    def test_click_without_image_does_nothing(self) -> None:
        win = QMainWindow()
        preview = AssetPreviewWidget(48, parent=win, enable_zoom=True)
        win.setCentralWidget(preview)
        win.show()

        preview.load_file(None)
        QTest.mouseClick(preview, Qt.MouseButton.LeftButton)
        self._app.processEvents()
        self.assertIsNone(preview._zoom_window)

        preview.load_file(Path('/tmp/does-not-exist-123456.png'))
        QTest.mouseClick(preview, Qt.MouseButton.LeftButton)
        self._app.processEvents()
        self.assertIsNone(preview._zoom_window)
        win.close()

    def test_click_png_opens_proportional_zoom_and_closes_via_button(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            img_path = Path(tmp) / 'sample.png'
            img = QImage(120, 60, QImage.Format.Format_ARGB32)
            img.fill(QColor('#ff8800'))
            self.assertTrue(img.save(str(img_path)))

            win = QMainWindow()
            preview = AssetPreviewWidget(48, parent=win, enable_zoom=True)
            win.setCentralWidget(preview)
            win.show()

            preview.load_file(img_path)
            QTest.mouseClick(preview, Qt.MouseButton.LeftButton)
            self._app.processEvents()

            zoom = preview._zoom_window
            self.assertIsNotNone(zoom)
            self.assertTrue(zoom.isVisible())
            self.assertEqual(zoom._media_widget.size(), QSize(320, 160))

            QTest.mouseClick(zoom.close_btn, Qt.MouseButton.LeftButton)
            self._app.processEvents()
            self.assertFalse(zoom.isVisible())
            win.close()

    def test_click_svg_opens_proportional_zoom_and_closes_on_main_window_click(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            svg_path = Path(tmp) / 'sprite.svg'
            svg_path.write_text(
                '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="50" viewBox="0 0 100 50">'
                '<rect width="100" height="50" fill="#22cc88"/></svg>',
                encoding='utf-8',
            )

            win = QMainWindow()
            central = QWidget(win)
            win.setCentralWidget(central)
            win.resize(400, 300)
            preview = AssetPreviewWidget(48, parent=central, enable_zoom=True)
            preview.move(10, 10)
            win.show()

            preview.load_file(svg_path)
            QTest.mouseClick(preview, Qt.MouseButton.LeftButton)
            self._app.processEvents()

            zoom = preview._zoom_window
            self.assertIsNotNone(zoom)
            self.assertTrue(zoom.isVisible())
            self.assertEqual(zoom._media_widget.size(), QSize(320, 160))

            QTest.mouseClick(win, Qt.MouseButton.LeftButton, pos=QPoint(250, 200))
            self._app.processEvents()
            self.assertFalse(zoom.isVisible())
            win.close()

    def test_all_image_selectors_have_zoom_enabled(self) -> None:
        noop = lambda: None  # noqa: E731
        row = AssetPickerRow(noop)
        self.assertTrue(row.preview._enable_zoom)

        story_tab = StoryMetadataTab(noop)
        self.assertTrue(story_tab.favicon_preview._enable_zoom)
        self.assertTrue(story_tab.splash_picker.preview._enable_zoom)
        self.assertTrue(story_tab.splash_end_picker.preview._enable_zoom)

        chars_tab = CharactersTab(noop)
        for picker in (
            chars_tab.top_picker,
            chars_tab.front_picker,
            chars_tab.left_picker,
            chars_tab.right_picker,
            chars_tab.cutscene_picker,
        ):
            self.assertTrue(picker.preview._enable_zoom)

        app_root = Path(__file__).resolve().parents[2]
        items_tab = ItemsTab(app_root, noop)
        self.assertTrue(items_tab.image_picker.preview._enable_zoom)

        map_tab = MapLocationsTab(app_root, noop)
        self.assertTrue(map_tab.logo_picker.preview._enable_zoom)


if __name__ == '__main__':
    unittest.main()
