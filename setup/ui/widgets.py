from __future__ import annotations

from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import threading
from typing import Callable

from PySide6.QtCore import QEvent, QObject, QSize, QTimer, Qt
from PySide6.QtGui import QGuiApplication, QMouseEvent, QPixmap
from PySide6.QtSvg import QSvgRenderer
from PySide6.QtSvgWidgets import QSvgWidget
from PySide6.QtWidgets import (
    QApplication,
    QDialog,
    QFileDialog,
    QHBoxLayout,
    QLabel,
    QLineEdit,
    QMessageBox,
    QPushButton,
    QStackedWidget,
    QVBoxLayout,
    QWidget,
)

from ..core.story_io import StoryIOError, import_asset_file


def compute_zoom_target_size(
    image_size: QSize,
    max_bounds: QSize,
    min_side: int = 320,
) -> QSize:
    """Calcula o tamanho de exibição mantendo a proporção exata da imagem."""
    max_w = max(1, max_bounds.width())
    max_h = max(1, max_bounds.height())
    w = image_size.width()
    h = image_size.height()
    if w <= 0 or h <= 0:
        side = min(min_side, max_w, max_h)
        return QSize(max(1, side), max(1, side))

    largest = max(w, h)
    if largest < min_side:
        scale = min_side / largest
        w = max(1, round(w * scale))
        h = max(1, round(h * scale))

    if w > max_w or h > max_h:
        ratio = min(max_w / w, max_h / h)
        w = max(1, round(w * ratio))
        h = max(1, round(h * ratio))

    return QSize(w, h)


class ImageZoomWindow(QDialog):
    """Janela não-modal de ampliação proporcional da imagem selecionada."""

    def __init__(self, file_path: Path, anchor_window: QWidget | None = None) -> None:
        super().__init__(anchor_window)
        self._file_path = file_path
        self._anchor_window = anchor_window if anchor_window is not self else None
        self._closing = False
        self._armed = False

        self.setModal(False)
        self.setWindowTitle(f'Visualização — {file_path.name}')
        self.setWindowFlags(
            Qt.WindowType.Window
            | Qt.WindowType.WindowTitleHint
            | Qt.WindowType.WindowCloseButtonHint
        )
        self.setStyleSheet(
            'QDialog { background: #0e1015; color: #f4f5f7; }'
            'QLabel#zoom_frame { background: #141720; border: 1px solid #2b3245; border-radius: 6px; }'
        )

        screen = (
            self._anchor_window.screen()
            if self._anchor_window is not None and self._anchor_window.screen() is not None
            else QGuiApplication.primaryScreen()
        )
        if screen is not None:
            avail = screen.availableGeometry().size()
            max_bounds = QSize(max(240, int(avail.width() * 0.8) - 48), max(240, int(avail.height() * 0.8) - 96))
        else:
            max_bounds = QSize(960, 720)

        layout = QVBoxLayout(self)
        layout.setContentsMargins(14, 14, 14, 14)
        layout.setSpacing(10)

        if file_path.suffix.lower() == '.svg':
            renderer = QSvgRenderer(str(file_path))
            raw_size = renderer.defaultSize()
            if not renderer.isValid() or raw_size.isEmpty():
                raw_size = QSize(320, 320)
            target_size = compute_zoom_target_size(raw_size, max_bounds)
            self._media_widget: QWidget = QSvgWidget(str(file_path), self)
            self._media_widget.setFixedSize(target_size)
        else:
            pix = QPixmap(str(file_path))
            raw_size = pix.size()
            target_size = compute_zoom_target_size(raw_size, max_bounds)
            label = QLabel(self)
            label.setObjectName('zoom_frame')
            label.setAlignment(Qt.AlignmentFlag.AlignCenter)
            label.setFixedSize(target_size)
            if not pix.isNull():
                is_small_upscale = max(raw_size.width(), raw_size.height()) <= 128 and (
                    target_size.width() > raw_size.width() or target_size.height() > raw_size.height()
                )
                transform = (
                    Qt.TransformationMode.FastTransformation
                    if is_small_upscale
                    else Qt.TransformationMode.SmoothTransformation
                )
                scaled = pix.scaled(target_size, Qt.AspectRatioMode.KeepAspectRatio, transform)
                label.setPixmap(scaled)
            self._media_widget = label

        layout.addWidget(self._media_widget, alignment=Qt.AlignmentFlag.AlignCenter)

        footer = QHBoxLayout()
        footer.addStretch(1)
        self.close_btn = QPushButton('Fechar', self)
        self.close_btn.clicked.connect(self.close)
        footer.addWidget(self.close_btn)
        layout.addLayout(footer)

        self.adjustSize()
        self.setFixedSize(self.sizeHint())

        if self._anchor_window is not None:
            anchor_geo = self._anchor_window.frameGeometry()
            x = anchor_geo.center().x() - self.width() // 2
            y = anchor_geo.center().y() - self.height() // 2
            self.move(x, y)
            app = QApplication.instance()
            if app is not None:
                app.installEventFilter(self)
        QTimer.singleShot(0, self._arm_auto_close)

    def _arm_auto_close(self) -> None:
        if not self._closing:
            self._armed = True

    def eventFilter(self, watched: QObject, event: QEvent) -> bool:
        if self._armed and not self._closing and self._anchor_window is not None:
            if event.type() == QEvent.Type.MouseButtonPress and isinstance(watched, QWidget):
                if watched.window() is self._anchor_window:
                    self.close()
        return super().eventFilter(watched, event)

    def changeEvent(self, event: QEvent) -> None:
        if (
            self._armed
            and event.type() == QEvent.Type.ActivationChange
            and not self.isActiveWindow()
            and self.isVisible()
            and not self._closing
        ):
            app = QApplication.instance()
            if app is not None and app.activeWindow() is self._anchor_window:
                self.close()
        super().changeEvent(event)

    def closeEvent(self, event: QEvent) -> None:
        self._closing = True
        app = QApplication.instance()
        if app is not None:
            app.removeEventFilter(self)
        super().closeEvent(event)


class AssetPreviewWidget(QStackedWidget):
    """Exibe preview de imagem PNG/JPG/WEBP ou SVG em tamanho fixo ou proporcional."""

    def __init__(
        self,
        size: int = 56,
        parent: QWidget | None = None,
        enable_zoom: bool = False,
        fit_aspect: bool = False,
        max_size: tuple[int, int] | None = None,
    ) -> None:
        super().__init__(parent)
        self._size = size
        self._enable_zoom = enable_zoom
        self._fit_aspect = fit_aspect
        self._max_size = max_size or (size, size)
        self._loaded_file: Path | None = None
        self._has_valid_image = False
        self._zoom_window: ImageZoomWindow | None = None

        self._raster = QLabel('—')
        self._raster.setAlignment(Qt.AlignmentFlag.AlignCenter)
        self._raster.setStyleSheet('border: 1px solid #2b3245; border-radius: 6px; background: #0e1015;')

        self._svg = QSvgWidget()
        self.addWidget(self._raster)
        self.addWidget(self._svg)
        self._apply_box_size(size, size)

    def _apply_box_size(self, width: int, height: int) -> None:
        self.setFixedSize(width, height)
        self._svg.setFixedSize(width, height)

    def _proportional_box(self, raw_size: QSize) -> tuple[int, int]:
        if not self._fit_aspect:
            return self._size, self._size
        max_w, max_h = self._max_size
        w, h = raw_size.width(), raw_size.height()
        if w <= 0 or h <= 0:
            return min(max_w, self._size), min(max_h, max(90, round(self._size * 0.625)))
        ratio = min(max_w / w, max_h / h)
        return max(1, round(w * ratio)), max(1, round(h * ratio))

    def load_file(self, file_path: Path | None) -> None:
        if not file_path or not file_path.is_file():
            self._loaded_file = None
            self._has_valid_image = False
            self._update_zoom_affordance()
            box_w, box_h = self._proportional_box(QSize(0, 0))
            self._apply_box_size(box_w, box_h)
            self._raster.setPixmap(QPixmap())
            self._raster.setText('—')
            self.setCurrentWidget(self._raster)
            return
        if file_path.suffix.lower() == '.svg':
            self._svg.load(str(file_path))
            renderer = self._svg.renderer()
            self._loaded_file = file_path
            self._has_valid_image = renderer.isValid()
            box_w, box_h = self._proportional_box(renderer.defaultSize())
            self._apply_box_size(box_w, box_h)
            self._update_zoom_affordance()
            self.setCurrentWidget(self._svg)
            return
        pix = QPixmap(str(file_path))
        if pix.isNull():
            self._loaded_file = None
            self._has_valid_image = False
            self._update_zoom_affordance()
            box_w, box_h = self._proportional_box(QSize(0, 0))
            self._apply_box_size(box_w, box_h)
            self._raster.setPixmap(QPixmap())
            self._raster.setText('!')
            self.setCurrentWidget(self._raster)
            return
        box_w, box_h = self._proportional_box(pix.size())
        self._apply_box_size(box_w, box_h)
        scaled = pix.scaled(
            max(1, box_w - 4),
            max(1, box_h - 4),
            Qt.AspectRatioMode.KeepAspectRatio,
            Qt.TransformationMode.SmoothTransformation,
        )
        self._loaded_file = file_path
        self._has_valid_image = True
        self._update_zoom_affordance()
        self._raster.setText('')
        self._raster.setPixmap(scaled)
        self.setCurrentWidget(self._raster)

    def _update_zoom_affordance(self) -> None:
        if self._enable_zoom and self._has_valid_image:
            self.setCursor(Qt.CursorShape.PointingHandCursor)
            self.setToolTip('Clique para ampliar a imagem')
        else:
            self.unsetCursor()
            self.setToolTip('')

    def open_zoom(self) -> ImageZoomWindow | None:
        if not (self._enable_zoom and self._has_valid_image and self._loaded_file):
            return None
        if self._zoom_window is not None:
            try:
                self._zoom_window.close()
            except RuntimeError:
                pass
            self._zoom_window = None
        anchor = self.window() if self.window() is not self else None
        win = ImageZoomWindow(self._loaded_file, anchor_window=anchor)
        self._zoom_window = win
        win.show()
        win.raise_()
        win.activateWindow()
        return win

    def mousePressEvent(self, event: QMouseEvent) -> None:
        if self._enable_zoom and self._has_valid_image and event.button() == Qt.MouseButton.LeftButton:
            self.open_zoom()
            event.accept()
            return
        super().mousePressEvent(event)


class AssetPickerRow(QWidget):
    """Campo de caminho relativo + preview + botões Importar/Limpar."""

    def __init__(
        self,
        story_dir_provider: Callable[[], Path | None],
        subdir: str = 'assets',
        allow_clear: bool = False,
        on_changed: Callable[[str], None] | None = None,
        parent: QWidget | None = None,
    ) -> None:
        super().__init__(parent)
        self._story_dir_provider = story_dir_provider
        self._subdir = subdir
        self._on_changed = on_changed

        layout = QHBoxLayout(self)
        layout.setContentsMargins(0, 0, 0, 0)
        layout.setSpacing(8)

        self.preview = AssetPreviewWidget(48, enable_zoom=True)
        self.path_edit = QLineEdit()
        self.path_edit.setReadOnly(True)
        self.path_edit.setPlaceholderText('Nenhuma imagem selecionada')

        self.import_btn = QPushButton('Importar...')
        self.import_btn.clicked.connect(self._on_import)

        layout.addWidget(self.preview)
        layout.addWidget(self.path_edit, 1)
        layout.addWidget(self.import_btn)

        if allow_clear:
            self.clear_btn = QPushButton('Limpar')
            self.clear_btn.clicked.connect(self._on_clear)
            layout.addWidget(self.clear_btn)

    def set_value(self, rel_path: str) -> None:
        self.path_edit.setText(rel_path or '')
        story_dir = self._story_dir_provider()
        full = (story_dir / rel_path) if (story_dir and rel_path) else None
        self.preview.load_file(full)

    def value(self) -> str:
        return self.path_edit.text().strip()

    def _on_import(self) -> None:
        story_dir = self._story_dir_provider()
        if not story_dir:
            return
        file_path, _ = QFileDialog.getOpenFileName(
            self,
            'Selecionar imagem',
            str(story_dir),
            'Imagens (*.png *.jpg *.jpeg *.webp *.svg)',
        )
        if not file_path:
            return
        try:
            rel = import_asset_file(story_dir, Path(file_path), target_subdir=self._subdir)
        except StoryIOError as err:
            QMessageBox.warning(self, 'Imagem inválida', str(err))
            return
        self.set_value(rel)
        if self._on_changed:
            self._on_changed(rel)

    def _on_clear(self) -> None:
        self.set_value('')
        if self._on_changed:
            self._on_changed('')


class QuietHttpHandler(SimpleHTTPRequestHandler):
    def log_message(self, format: str, *args: object) -> None:  # noqa: A002
        return


class LocalPreviewServer:
    """Servidor HTTP local sob demanda para testar a história no navegador."""

    def __init__(self, app_root: Path) -> None:
        self.app_root = app_root
        self._server: ThreadingHTTPServer | None = None
        self._thread: threading.Thread | None = None

    def ensure_running(self) -> int:
        if self._server is not None:
            return int(self._server.server_port)
        handler = partial(QuietHttpHandler, directory=str(self.app_root))
        self._server = ThreadingHTTPServer(('127.0.0.1', 0), handler)
        self._thread = threading.Thread(target=self._server.serve_forever, daemon=True)
        self._thread.start()
        return int(self._server.server_port)

    def stop(self) -> None:
        if self._server is not None:
            self._server.shutdown()
            self._server.server_close()
            self._server = None
            self._thread = None
