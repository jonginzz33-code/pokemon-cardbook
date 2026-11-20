package expo.modules.cardscanner

import android.app.Activity
import android.content.Context
import android.net.Uri
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.documentscanner.GmsDocumentScannerOptions
import com.google.mlkit.vision.documentscanner.GmsDocumentScanning
import com.google.mlkit.vision.documentscanner.GmsDocumentScanningResult
import com.google.mlkit.vision.text.TextRecognition
import com.google.mlkit.vision.text.TextRecognizer
import com.google.mlkit.vision.text.japanese.JapaneseTextRecognizerOptions
import com.google.mlkit.vision.text.korean.KoreanTextRecognizerOptions
import com.google.mlkit.vision.text.latin.TextRecognizerOptions
import expo.modules.kotlin.Promise
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.File

private const val SCAN_REQUEST_CODE = 46021

/**
 * 카드 도감 전용 네이티브 모듈 (Google ML Kit)
 * - scanCard(): 카드 촬영 화면. 모서리를 자동으로 찾아 반듯하게 펴서 잘라 준 사진 주소를 돌려줌 (취소하면 null)
 * - recognizeText(uri, script): 사진 속 글자를 줄 단위로 읽음. script = "korean" | "japanese" | "latin"
 */
class CardScannerModule : Module() {
  private var scanPromise: Promise? = null

  private val context: Context
    get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

  override fun definition() = ModuleDefinition {
    Name("CardScanner")

    AsyncFunction("recognizeText") { uri: String, script: String, promise: Promise ->
      var recognizer: TextRecognizer? = null
      try {
        val parsed: Uri =
          if (uri.startsWith("content://") || uri.startsWith("file://")) Uri.parse(uri) else Uri.fromFile(File(uri))
        val image = InputImage.fromFilePath(context, parsed)
        val r = when (script) {
          "korean" -> TextRecognition.getClient(KoreanTextRecognizerOptions.Builder().build())
          "japanese" -> TextRecognition.getClient(JapaneseTextRecognizerOptions.Builder().build())
          else -> TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS)
        }
        recognizer = r
        r.process(image)
          .addOnSuccessListener { text ->
            val lines = ArrayList<String>()
            for (block in text.textBlocks) {
              for (line in block.lines) lines.add(line.text)
            }
            promise.resolve(lines)
            r.close()
          }
          .addOnFailureListener { e ->
            promise.reject("ERR_OCR", e.message ?: e.toString(), e)
            r.close()
          }
      } catch (e: Throwable) {
        recognizer?.close()
        promise.reject("ERR_OCR", e.message ?: e.toString(), e)
      }
    }

    AsyncFunction("scanCard") { promise: Promise ->
      val activity = appContext.currentActivity
      if (scanPromise != null) {
        promise.reject("ERR_BUSY", "이미 카드 촬영 화면이 열려 있어요", null)
      } else if (activity == null) {
        promise.reject("ERR_ACTIVITY", "화면을 찾지 못했어요", null)
      } else {
        val options = GmsDocumentScannerOptions.Builder()
          .setGalleryImportAllowed(true)
          .setPageLimit(1)
          .setResultFormats(GmsDocumentScannerOptions.RESULT_FORMAT_JPEG)
          .setScannerMode(GmsDocumentScannerOptions.SCANNER_MODE_BASE)
          .build()
        GmsDocumentScanning.getClient(options)
          .getStartScanIntent(activity)
          .addOnSuccessListener { sender ->
            try {
              scanPromise = promise
              activity.startIntentSenderForResult(sender, SCAN_REQUEST_CODE, null, 0, 0, 0)
            } catch (e: Throwable) {
              scanPromise = null
              promise.reject("ERR_SCAN", e.message ?: e.toString(), e)
            }
          }
          .addOnFailureListener { e ->
            promise.reject("ERR_SCAN_UNAVAILABLE", e.message ?: e.toString(), e)
          }
      }
    }

    OnActivityResult { _, payload ->
      if (payload.requestCode == SCAN_REQUEST_CODE) {
        val p = scanPromise
        scanPromise = null
        if (p != null) {
          if (payload.resultCode != Activity.RESULT_OK || payload.data == null) {
            p.resolve(null)
          } else {
            try {
              val result = GmsDocumentScanningResult.fromActivityResultIntent(payload.data)
              val page = result?.pages?.firstOrNull()
              p.resolve(page?.imageUri?.toString())
            } catch (e: Throwable) {
              p.reject("ERR_SCAN", e.message ?: e.toString(), e)
            }
          }
        }
      }
    }
  }
}
