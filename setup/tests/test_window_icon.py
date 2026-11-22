import os
import tempfile
import unittest
from pathlib import Path

os.environ.setdefault('QT_QPA_PLATFORM', 'offscreen')

from PySide6.QtGui import QColor, QImage
from PySide6.QtWidgets import QApplication

from setup.ui.main_window import SetupMainWindow
from setup.ui.widgets import build_window_icon


class WindowIconTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls._app = QApplication.instance() or QApplication([])

    def test_build_window_icon_handles_missing_png_and_svg(self) -> None:
        self.assertTrue(build_window_icon(None).isNull())
        self.assertTrue(build_window_icon(Path('/tmp/no-such-icon-999.png')).isNull())

        with tempfile.TemporaryDirectory() as tmp:
            png_path = Path(tmp) / 'favicon.png'
            img = QImage(64, 64, QImage.Format.Format_ARGB32)
            img.fill(QColor('#f59e0b'))
            self.assertTrue(img.save(str(png_path)))
            png_icon = build_window_icon(png_path)
            self.assertFalse(png_icon.isNull())

            svg_path = Path(tmp) / 'favicon.svg'
            svg_path.write_text(
                '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">'
                '<rect width="64" height="64" fill="#22c55e"/></svg>',
                encoding='utf-8',
            )
            svg_icon = build_window_icon(svg_path)
            self.assertFalse(svg_icon.isNull())
            self.assertFalse(svg_icon.pixmap(128, 128).isNull())

    def test_main_window_syncs_window_and_app_icon_with_loaded_story(self) -> None:
        app_root = Path(__file__).resolve().parents[2]
        win = SetupMainWindow(app_root)
        try:
            if win._pkg is not None:
                self.assertFalse(win.windowIcon().isNull())
                self.assertFalse(self._app.windowIcon().isNull())

            win._load_story(None)
            self.assertTrue(win.windowIcon().isNull())
            self.assertTrue(self._app.windowIcon().isNull())
        finally:
            win.close()


if __name__ == '__main__':
    unittest.main()
