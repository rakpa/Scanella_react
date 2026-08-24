import 'dart:math' as math;
import 'dart:ui' as ui;

import 'package:flutter/foundation.dart';
import 'package:image/image.dart' as img;
import 'package:scan2/core/imaging/raster.dart';
import 'package:scan2/features/camera/domain/quad_detector.dart';
import 'package:scan2/features/crop/domain/image_processor.dart';
import 'package:scan2/features/crop/domain/perspective_transformer.dart';

/// Longest edge of the raster every *filter* preview re-renders on.
///
/// Interactive preview is the whole reason this exists: filtering a 12MP
/// camera frame takes many seconds per tap, which is indistinguishable from
/// the filter being broken. This budget is spent once per tap of a filter
/// chip, so it stays small; only the final save touches full resolution.
const int kFilterPreviewMaxEdge = 1200;

/// Floor for the crop-stage raster.
const int kCropPreviewMinEdge = 1000;

/// Ceiling for the crop-stage raster. Past roughly this the page is finer
/// than the panel showing it and the only cost left is memory.
const int kCropPreviewMaxEdge = 2400;

/// Longest edge for the crop stage on the device actually running.
///
/// The crop stage used to share the filter budget — a flat 1000 — and on any
/// modern handset that is smaller than the screen it lands on: a portrait
/// page becomes 750x1000 and is then stretched across a 1080- or
/// 1440-pixel-wide display, so the page the customer is asked to place
/// corners on is a visibly soft version of the sharp one being saved.
///
/// It can afford to be sharp where the filter preview cannot: this raster is
/// rasterised once when the screen opens, while the filter preview is rebuilt
/// on every adjustment. Sizing it to the display costs one downscale and buys
/// back the sharpness, and pixels are only spent where there are pixels to
/// show them.
int cropPreviewEdgeForDisplay() {
  final view = ui.PlatformDispatcher.instance.implicitView;
  if (view == null) return kCropPreviewMinEdge;

  final size = view.physicalSize;
  final longest = math.max(size.width, size.height);
  if (!longest.isFinite || longest <= 0) return kCropPreviewMinEdge;

  return longest.round().clamp(kCropPreviewMinEdge, kCropPreviewMaxEdge);
}

/// A decoded, orientation-corrected, downscaled copy of a page, reused for
/// every preview render so a filter change never re-decodes the JPEG.
@immutable
class PreviewSource {
  const PreviewSource({
    required this.raster,
    required Raster? cropRaster,
    required this.sourceWidth,
    required this.sourceHeight,
  }) : _cropRaster = cropRaster;

  /// The filter-sized copy. Every [renderPreview] runs on this.
  final Raster raster;

  final Raster? _cropRaster;

  /// The sharper copy the crop stage places corners on, rasterised once.
  ///
  /// Falls back to [raster] when the page was already smaller than the filter
  /// budget, in which case the two would be the same pixels anyway.
  Raster get cropRaster => _cropRaster ?? raster;

  /// Dimensions of the full-resolution page this was derived from.
  final int sourceWidth;
  final int sourceHeight;

  double get sourceAspect => sourceHeight == 0 ? 1 : sourceWidth / sourceHeight;
}

/// Decodes [bytes] once into a preview-sized raster, off the UI isolate.
///
/// [maxEdge] defaults to whatever suits this display; pass it explicitly to
/// pin the size, as the tests do.
Future<PreviewSource?> loadPreviewSource(Uint8List bytes, {int? cropEdge}) {
  return compute(
    _loadPreviewIsolate,
    _PreviewLoad(
      bytes: bytes,
      cropEdge: cropEdge ?? cropPreviewEdgeForDisplay(),
    ),
  );
}

@immutable
class _PreviewLoad {
  const _PreviewLoad({required this.bytes, required this.cropEdge});

  final Uint8List bytes;
  final int cropEdge;
}

PreviewSource? _loadPreviewIsolate(_PreviewLoad request) {
  final decoded = img.decodeImage(request.bytes);
  if (decoded == null) return null;
  final baked = img.bakeOrientation(decoded);
  final full = Raster.fromImage(baked);

  // Derived from the crop copy rather than from [full]: it is already the
  // nearer size, so the second box filter runs over far fewer pixels and
  // lands on the same result.
  final crop = full.downscaledTo(request.cropEdge);
  final filter = crop.downscaledTo(kFilterPreviewMaxEdge);

  return PreviewSource(
    raster: filter,
    cropRaster: identical(crop, filter) ? null : crop,
    sourceWidth: baked.width,
    sourceHeight: baked.height,
  );
}

/// What a preview render should show.
@immutable
class PreviewRequest {
  const PreviewRequest({
    required this.source,
    required this.adjustments,
    this.quad,
  });

  final PreviewSource source;
  final ScanAdjustments adjustments;

  /// When set, the preview is perspective-corrected to this quad first.
  final Quad? quad;
}

/// Renders a preview raster: warp (if a quad is given), then filter.
Future<Raster> renderPreview(PreviewRequest request) {
  return compute(_renderPreviewIsolate, request);
}

Raster _renderPreviewIsolate(PreviewRequest request) {
  var raster = request.source.raster;

  final quad = request.quad;
  if (quad != null && !PerspectiveTransformer.isFullFrame(quad)) {
    raster = warpRaster(raster, quad) ?? raster;
  }

  return applyAdjustments(raster, request.adjustments);
}
