package com.vora.ar

import android.content.Context
import com.google.ar.core.*
import com.google.ar.core.exceptions.*
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
        // Called from JS on a ~100ms interval while recording
        Function("recordPose") {
            val session = arSession ?: return@Function
            val frame = try {
                session.update()
            } catch (e: Exception) {
                return@Function
            }

            val camera = frame.camera
            if (camera.trackingState != TrackingState.TRACKING) return@Function

            val pose = camera.pose  // world-space camera pose in metres
            val poseEntry = JSONObject().apply {
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
            poseLog.add(poseEntry)
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
        // SUPPORTED_APK_TOO_OLD, UNKNOWN_CHECKING/TIMED_OUT/ERROR) means
        // Session(ctx) in startCapture() would throw immediately — reporting
        // those as "supported" showed the AR VIO badge for a feature that was
        // about to silently fail with no user-visible error.
        Function("isSupported") {
            val ctx: Context = appContext.reactContext ?: return@Function false
            val avail = ArCoreApk.getInstance().checkAvailability(ctx)
            avail == ArCoreApk.Availability.SUPPORTED_INSTALLED
        }
    }
}
