package ai.offgridmobile

import com.facebook.react.bridge.ReadableArray
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.views.textinput.ReactTextInputManager
import com.facebook.react.views.textinput.ReactEditText

class IncognitoTextInputManager : ReactTextInputManager() {
    
    companion object {
        private const val COMMAND_CLEAR = 1 // Numerical command for "clear" used in React Native
    }

    override fun getName(): String {
        return "IncognitoTextInput"
    }

    override fun createViewInstance(reactContext: ThemedReactContext): ReactEditText {
        return IncognitoEditText(reactContext)
    }
}
