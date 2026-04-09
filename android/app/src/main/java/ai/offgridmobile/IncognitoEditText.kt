package ai.offgridmobile

import android.content.Context
import android.view.inputmethod.EditorInfo
import android.view.inputmethod.InputConnection
import android.view.inputmethod.InputMethodManager
import com.facebook.react.views.textinput.ReactEditText

class IncognitoEditText(context: Context) : ReactEditText(context) {

    init {
        // Remove the default Android underline
        this.background = null
    }

    override fun onCreateInputConnection(outAttrs: EditorInfo): InputConnection? {
        val connection = super.onCreateInputConnection(outAttrs)
        if (outAttrs != null) {
            // Apply the flag to prevent personalized learning (Incognito Mode)
            // This is the most reliable way as it's set at the creation of the connection
            outAttrs.imeOptions = outAttrs.imeOptions or EditorInfo.IME_FLAG_NO_PERSONALIZED_LEARNING
            
            // Extra insurance for Gboard
            val currentPrivateOptions = outAttrs.privateImeOptions
            if (currentPrivateOptions == null) {
                outAttrs.privateImeOptions = "nm,no-personalized-learning"
            } else if (!currentPrivateOptions.contains("no-personalized-learning")) {
                outAttrs.privateImeOptions = "$currentPrivateOptions,nm,no-personalized-learning"
            }
        }
        return connection
    }
}
