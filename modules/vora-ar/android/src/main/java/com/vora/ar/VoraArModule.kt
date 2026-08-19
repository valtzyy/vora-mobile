package com.vora.ar

import android.content.Context
import android.os.Handler
import android.os.Looper
import com.google.ar.core.*
import com.google.ar.core.exceptions.*
import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import org.json.JSONArray
import org.json.JSONObject
import java.io.File

/**
 * VoraArModule — Expo native module for ARCore-based video capture with pose logging.
 *
 * Uses ARCore Recording API (RecordingConfig) to record MP4 video directly via the ARCore
 * capture pipeline, preventing CameraAccessException / camera resource lock conflicts.
 *
 * Exposes synchronous functions to JavaScript:
 *   startCapture(videoPath: String)  — opens an AR session + starts ARCore MP4 dataset recording
 *   recordPose()                     — samples the current ARCore camera pose
 *   stopCapture(posesPath: String)   — stops recording, writes poses.json sidecar, returns stats
 *   isSupported()                    — checks if ARCore is installed and capable on this device
 *
 * The poses.json sidecar is an array of objects:
 *   { frame, x, y, z, qw, qx, qy, qz, ts }
 * where (x, y, z) are ARCore world-space camera positions in **metres**.
 */
class VoraArModule : Module() {

    private var arSession: Session? = null
    private val poseLog = mutableListOf<JSONObject>()
    private var frameIndex = 0
    private var videoOutputPath: String? = null

    override fun definition() = ModuleDefinition {
        Name("VoraAr")

        // ── startCapture ────────────────────────────────────────────────────
        Function("startCapture") { videoPath: String ->
            val ctx: Context = appContext.reactContext
                ?: throw IllegalStateException("React context not available")

            // Check ARCore availability
            val availability = ArCoreApk.getInstance().checkAvailability(ctx)
            if (availability == ArCoreApk.Availability.UNSUPPORTED_DEVICE_NOT_CAPABLE) {
                throw UnsupportedOperationException("ARCore is not supported on this device")
            }

            // Create and configure AR session
            val session = Session(ctx).also { arSession = it }
            val config = Config(session).apply {
                updateMode = Config.UpdateMode.LATEST_CAMERA_IMAGE
                focusMode = Config.FocusMode.AUTO
                planeFindingMode = Config.PlaneFindingMode.DISABLED  // not needed for scale
                lightEstimationMode = Config.LightEstimationMode.DISABLED
            }
            session.configure(config)
            session.resume()

            // Prepare destination MP4 file
            val outputFile = File(videoPath)
            outputFile.parentFile?.mkdirs()
            videoOutputPath = videoPath

            // Use ARCore RecordingConfig to record MP4 video without Camera2 resource conflicts
            val recordingConfig = RecordingConfig(session).apply {
                setMp4DatasetFilePath(outputFile.absolutePath)
                setAutoStopOnPause(true)
            }
            session.startRecording(recordingConfig)

            poseLog.clear()
            frameIndex = 0

            Unit
        }

        // ── recordPose ──────────────────────────────────────────────────────
        // Called from JS on a ~100ms interval while recording.
        //
        // Written with a single exit point on purpose. This body is inferred
        // as returning Any?, so a bare `return@Function` is a compile error
        // ("expected 'Any?', actual 'Unit'") — Kotlin requires a value when
        // the lambda's return type isn't Unit. Nesting the guards instead of
        // early-returning sidesteps that entirely.
        Function("recordPose") {
            val session = arSession
            if (session != null) {
                val frame = try {
                    session.update()
                } catch (e: Exception) {
                    null
                }
                val camera = frame?.camera
                if (camera != null && camera.trackingState == TrackingState.TRACKING) {
                    val pose = camera.pose  // world-space camera pose in metres
                    poseLog.add(
                        JSONObject().apply {
                            put("frame", frameIndex++)
                            put("x", pose.tx().toDouble())
                            put("y", pose.ty().toDouble())
                            put("z", pose.tz().toDouble())
                            put("qw", pose.qw().toDouble())
                            put("qx", pose.qx().toDouble())
                            put("qy", pose.qy().toDouble())
                            put("qz", pose.qz().toDouble())
                            put("ts", System.currentTimeMillis())
                        }
                    )
                }
            }
            null
        }

        // ── stopCapture ─────────────────────────────────────────────────────
        Function("stopCapture") { posesPath: String ->
            val session = arSession

            // Stop ARCore MP4 dataset recording
            try {
                session?.stopRecording()
            } catch (e: Exception) {
                // stopRecording() can throw if no frames were captured
            }

            // Pause and close AR session
            try {
                session?.pause()
                session?.close()
            } catch (e: Exception) {
                // Ignore session close exceptions
            }
            arSession = null

            // Write poses.json sidecar
            val posesFile = File(posesPath)
            posesFile.parentFile?.mkdirs()
            val arr = JSONArray(poseLog)
            posesFile.writeText(arr.toString())

            mapOf(
                "posesWritten" to poseLog.size,
                "videoPath" to (videoOutputPath ?: ""),
                "posesPath" to posesPath
            )
        }

        // ── isSupported ─────────────────────────────────────────────────────
        // Only SUPPORTED_INSTALLED means an AR session can actually be opened
        // right now. Every other "supported" state (SUPPORTED_NOT_INSTALLED,
        // SUPPORTED_APK_TOO_OLD, UNKNOWN_TIMED_OUT/ERROR) means Session(ctx)
        // in startCapture() would throw immediately — reporting those as
        // "supported" showed the AR VIO badge for a feature that was about
        // to silently fail with no user-visible error.
        //
        // checkAvailability() is a snapshot, not a definitive answer: on a
        // device ARCore hasn't checked before, the *first* call routinely
        // returns UNKNOWN_CHECKING while it queries Play Services in the
        // background, and only settles on a real answer a few hundred ms
        // later. Calling it once, synchronously, on screen mount caught
        // that transient state and reported a perfectly capable device as
        // unsupported. This is async and polls the same synchronous check
        // for up to ~2s until it resolves past UNKNOWN_CHECKING.
        AsyncFunction("isSupported") { promise: Promise ->
            val ctx: Context? = appContext.reactContext
            if (ctx == null) {
                promise.resolve(false)
            } else {
                pollArCoreAvailability(ctx, promise, attemptsLeft = 10)
            }
        }
    }

    private fun pollArCoreAvailability(ctx: Context, promise: Promise, attemptsLeft: Int) {
        val avail = ArCoreApk.getInstance().checkAvailability(ctx)
        if (avail == ArCoreApk.Availability.UNKNOWN_CHECKING && attemptsLeft > 0) {
            Handler(Looper.getMainLooper()).postDelayed({
                pollArCoreAvailability(ctx, promise, attemptsLeft - 1)
            }, 200)
        } else {
            promise.resolve(avail == ArCoreApk.Availability.SUPPORTED_INSTALLED)
        }
    }
}
