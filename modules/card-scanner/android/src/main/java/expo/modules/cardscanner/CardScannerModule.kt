package expo.modules.cardscanner

import android.app.Activity
import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Matrix
import android.media.ExifInterface
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
/** 글자 읽기에 넘길 사진의 긴 쪽 최대 크기 (너무 크면 느리고 메모리를 많이 씀) */
private const val OCR_MAX_SIDE = 2000

/**
 * 오류를 사람이 읽을 수 있게: 어느 단계 · 예외 종류 · 메시지 · 원인 사슬 · 스택 앞부분.
 * 화면에 그대로 보여 주고, 사용자가 캡처해 보내면 원인을 바로 찾을 수 있게 해요.
 */
private fun describe(stage: String, e: Throwable): String {
  val sb = StringBuilder()
  sb.append("[").append(stage).append("] ")
  var t: Throwable? = e
  var depth = 0
  while (t != null && depth < 4) {
    if (depth > 0) sb.append("\n← 원인: ")
    sb.append(t.javaClass.name).append(": ").append(t.message ?: "(메시지 없음)")
    t = t.cause
    depth++
  }
  val frames = e.stackTrace.take(8)
  if (frames.isNotEmpty()) {
    sb.append("\n위치:")
    for (f in frames) sb.append("\n  at ").append(f.className).append('.').append(f.methodName)
      .append('(').append(f.fileName ?: "?").append(':').append(f.lineNumber).append(')')
  }
  return sb.toString()
}

/**
 * 카드 도감 전용 네이티브 모듈 (Google ML Kit)
 * - scanCard(): 카드 촬영 화면. 모서리를 자동으로 찾아 반듯하게 펴서 잘라 준 사진 주소를 돌려줌 (취소하면 null)
 * - recognizeText(uri, script): 사진 속 글자를 줄 단위로 읽음. script = "korean" | "japanese" | "latin"
 */
class CardScannerModule : Module() {
  private var scanPromise: Promise? = null
  private val recognizers = HashMap<String, TextRecognizer>()

  private val context: Context
    get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

  /** 인식기는 한 번 만들어 계속 씀 */
  private fun recognizer(script: String): TextRecognizer =
    recognizers.getOrPut(script) {
      when (script) {
        "korean" -> TextRecognition.getClient(KoreanTextRecognizerOptions.Builder().build())
        "japanese" -> TextRecognition.getClient(JapaneseTextRecognizerOptions.Builder().build())
        else -> TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS)
      }
    }

  /** 사진을 직접 Bitmap 으로 읽기 (회전 보정 · 큰 사진은 줄임) */
  private fun loadBitmap(uriString: String): Bitmap {
    val uri: Uri =
      if (uriString.startsWith("content://") || uriString.startsWith("file://")) Uri.parse(uriString)
      else Uri.fromFile(File(uriString))
    val resolver = context.contentResolver

    // 1) 크기만 먼저 읽어서 줄일 비율 정하기
    val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
    resolver.openInputStream(uri).use { BitmapFactory.decodeStream(it, null, bounds) }
    if (bounds.outWidth <= 0 || bounds.outHeight <= 0) {
      throw IllegalStateException("사진을 열 수 없어요 ($uriString)")
    }
    var sample = 1
    while (maxOf(bounds.outWidth, bounds.outHeight) / (sample * 2) >= OCR_MAX_SIDE) sample *= 2

    // 2) 실제로 읽기
    val opts = BitmapFactory.Options().apply { inSampleSize = sample }
    val bitmap = resolver.openInputStream(uri).use { BitmapFactory.decodeStream(it, null, opts) }
      ?: throw IllegalStateException("사진을 읽지 못했어요 ($uriString)")

    // 3) 사진 회전 정보 반영
    val rotation = try {
      resolver.openInputStream(uri).use { input ->
        if (input == null) 0
        else when (ExifInterface(input).getAttributeInt(ExifInterface.TAG_ORIENTATION, ExifInterface.ORIENTATION_NORMAL)) {
          ExifInterface.ORIENTATION_ROTATE_90 -> 90
          ExifInterface.ORIENTATION_ROTATE_180 -> 180
          ExifInterface.ORIENTATION_ROTATE_270 -> 270
          else -> 0
        }
      }
    } catch (e: Throwable) {
      0
    }
    if (rotation == 0) return bitmap
    val m = Matrix().apply { postRotate(rotation.toFloat()) }
    return Bitmap.createBitmap(bitmap, 0, 0, bitmap.width, bitmap.height, m, true)
  }

  override fun definition() = ModuleDefinition {
    Name("CardScanner")

    AsyncFunction("recognizeText") { uri: String, script: String, promise: Promise ->
      var stage = "사진 열기"
      try {
        val bitmap = loadBitmap(uri)
        stage = "사진 넘기기"
        val image = InputImage.fromBitmap(bitmap, 0)
        stage = "인식기 준비 ($script)"
        val r = recognizer(script)
        stage = "글자 읽기 ($script)"
        r.process(image)
          .addOnSuccessListener { text ->
            val lines = ArrayList<String>()
            for (block in text.textBlocks) {
              for (line in block.lines) lines.add(line.text)
            }
            promise.resolve(lines)
          }
          .addOnFailureListener { e ->
            promise.reject("ERR_OCR", describe("글자 읽기 ($script)", e), e)
          }
      } catch (e: Throwable) {
        promise.reject("ERR_OCR", describe(stage, e), e)
      }
    }

    AsyncFunction("scanCard") { promise: Promise ->
      var stage = "준비"
      try {
        val activity = appContext.currentActivity
        if (scanPromise != null) {
          promise.reject("ERR_BUSY", "이미 카드 촬영 화면이 열려 있어요", null)
        } else if (activity == null) {
          promise.reject("ERR_ACTIVITY", "화면을 찾지 못했어요", null)
        } else {
          stage = "촬영 설정"
          val options = GmsDocumentScannerOptions.Builder()
            .setGalleryImportAllowed(true)
            .setPageLimit(1)
            .setResultFormats(GmsDocumentScannerOptions.RESULT_FORMAT_JPEG)
            .setScannerMode(GmsDocumentScannerOptions.SCANNER_MODE_BASE)
            .build()
          stage = "촬영 화면 준비"
          GmsDocumentScanning.getClient(options)
            .getStartScanIntent(activity)
            .addOnSuccessListener { sender ->
              try {
                scanPromise = promise
                activity.startIntentSenderForResult(sender, SCAN_REQUEST_CODE, null, 0, 0, 0)
              } catch (e: Throwable) {
                scanPromise = null
                promise.reject("ERR_SCAN", describe("촬영 화면 열기", e), e)
              }
            }
            .addOnFailureListener { e ->
              promise.reject("ERR_SCAN_UNAVAILABLE", describe("촬영 화면 준비", e), e)
            }
        }
      } catch (e: Throwable) {
        scanPromise = null
        promise.reject("ERR_SCAN", describe(stage, e), e)
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
              p.reject("ERR_SCAN", describe("촬영 결과 받기", e), e)
            }
          }
        }
      }
    }
  }
}
