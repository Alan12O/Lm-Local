package ai.offgridmobile

import android.content.Context
import android.view.inputmethod.EditorInfo
import android.view.inputmethod.InputMethodManager
import android.widget.EditText
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.uimanager.UIManagerModule

class IncognitoKeyboardModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String {
        return "IncognitoKeyboard"
    }

    @ReactMethod
    fun setIncognito(viewTag: Int, isIncognito: Boolean) {
        val uiManager = reactApplicationContext.getNativeModule(UIManagerModule::class.java)
        
        uiManager?.addUIBlock { nativeViewHierarchyManager ->
            try {
                val view = nativeViewHierarchyManager.resolveView(viewTag)
                if (view is EditText) {
                    if (isIncognito) {
                        // Apply the flag to prevent personalized learning
                        view.imeOptions = view.imeOptions or EditorInfo.IME_FLAG_NO_PERSONALIZED_LEARNING
                        // Extra insurance for Gboard: nm (no-micro), and private flag
                        view.privateImeOptions = "nm,no-personalized-learning"
                    } else {
                        // Remove the flag
                        view.imeOptions = view.imeOptions and EditorInfo.IME_FLAG_NO_PERSONALIZED_LEARNING.inv()
                        view.privateImeOptions = null
                    }
                    
                    // Force restart input connection to apply changes immediately
                    val imm = reactApplicationContext.getSystemService(Context.INPUT_METHOD_SERVICE) as InputMethodManager
                    imm.restartInput(view)
                }
            } catch (e: Exception) {
                // Ignore errors if view is not found or already unmounted
            }
        }
    }
}
