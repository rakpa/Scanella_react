import 'dart:io';
import 'dart:typed_data';

import 'package:file_picker/file_picker.dart';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:image_picker/image_picker.dart';
import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';
import 'package:printing/printing.dart';
import 'package:scan2/features/camera/domain/quad_detector.dart';
import 'package:scan2/features/crop/domain/image_processor.dart';
import 'package:scan2/features/crop/domain/page_processor.dart';
import 'package:scan2/features/library/data/document_store.dart';

/// Bringing in pages that were never photographed on this phone.
///
/// A scanner that can only see through its own camera turns away the two
/// commonest documents people actually need to send: the PDF a company
/// emailed them, and the photo of a receipt they already took last week.
/// Both arrive here as ordinary pages, so everything downstream — enhance,
/// reorder, export — treats them the same as a capture.
class ImportService {
  const ImportService({
    this.processor = const PageProcessor(),
    this.picker,
  });

  final PageProcessor processor;

  /// Injected by tests, which have no photo library to open.
  final ImagePicker? picker;

  /// Photos already in the library. Multi-select, because a receipt and its
  /// itemised second page are one document, not two.
  Future<List<ProcessedPage>> fromPhotos({
    required ScanFilter filter,
    void Function(int done, int total)? onProgress,
  }) async {
    if (kIsWeb) {
      throw StateError('Importing is available on iOS and Android.');
    }
    final files = await (picker ?? ImagePicker()).pickMultiImage();
    if (files.isEmpty) return const [];
    return _process([for (final f in files) f.path], filter, onProgress);
  }

  /// Images or PDFs from Files / Drive / iCloud.
  ///
  /// A PDF is rasterised a page at a time rather than embedded: the rest of
  /// the app works on page images, and a document whose pages cannot be
  /// cropped, enhanced or reordered would be an import in name only.
  Future<List<ProcessedPage>> fromFiles({
    required ScanFilter filter,
    void Function(int done, int total)? onProgress,
  }) async {
    if (kIsWeb) {
      throw StateError('Importing is available on iOS and Android.');
    }
    final result = await FilePicker.platform.pickFiles(
      allowMultiple: true,
      type: FileType.custom,
      allowedExtensions: const ['pdf', 'jpg', 'jpeg', 'png', 'heic', 'heif'],
    );
    final picked = result?.files ?? const <PlatformFile>[];
    if (picked.isEmpty) return const [];

    final imagePaths = <String>[];
    for (final file in picked) {
      final path = file.path;
      if (path == null) continue;
      if (p.extension(path).toLowerCase() == '.pdf') {
        imagePaths.addAll(await _rasterisePdf(path));
      } else {
        imagePaths.add(path);
      }
    }
    if (imagePaths.isEmpty) {
      throw StateError('Nothing in that selection could be read as a page.');
    }
    return _process(imagePaths, filter, onProgress);
  }

  /// Renders each PDF page to a PNG in the temp directory and returns the
  /// paths, in page order.
  Future<List<String>> _rasterisePdf(String pdfPath) async {
    final bytes = await File(pdfPath).readAsBytes();
    final directory = await getTemporaryDirectory();
    final stem = p.basenameWithoutExtension(pdfPath);
    final stamp = DateTime.now().millisecondsSinceEpoch;
    final out = <String>[];
    var index = 0;

    // 200dpi: enough that body text stays sharp after enhancement, without
    // producing pages so large the filters take seconds each.
    await for (final page in Printing.raster(bytes, dpi: 200)) {
      final png = await page.toPng();
      final file = File(p.join(directory.path, '${stem}_${stamp}_$index.png'));
      await file.writeAsBytes(png, flush: true);
      out.add(file.path);
      index++;
    }
    return out;
  }

  Future<List<ProcessedPage>> _process(
    List<String> paths,
    ScanFilter filter,
    void Function(int done, int total)? onProgress,
  ) async {
    final processed = <ProcessedPage>[];
    for (var i = 0; i < paths.length; i++) {
      onProgress?.call(i, paths.length);
      final result = await processor.process(
        imagePath: paths[i],
        // An imported page is already a page. Running edge detection over a
        // PDF render or a screenshot finds the text block, not the sheet,
        // and crops into the content.
        detectEdges: false,
        adjustments: ScanAdjustments(filter: filter),
      );
      processed.add(
        ProcessedPage(
          originalPath: paths[i],
          bytes: result.bytes,
          quad: const Quad.fullFrame(),
          adjustments: result.adjustments,
        ),
      );
    }
    onProgress?.call(paths.length, paths.length);
    return processed;
  }

  /// Bytes of the first selected photo, for text recognition. OCR reads an
  /// image; it has no use for the library plumbing.
  Future<Uint8List?> pickImageBytes() async {
    if (kIsWeb) return null;
    final file = await (picker ?? ImagePicker()).pickImage(
      source: ImageSource.gallery,
    );
    if (file == null) return null;
    return file.readAsBytes();
  }
}
