package com.storyuniverse

import android.util.Log
import android.webkit.WebView
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate

class MainActivity : ReactActivity() {

  companion object {
    private const val TAG = "BackTrace"
  }


  override fun getMainComponentName(): String = "storyuniverse"

  override fun createReactActivityDelegate(): ReactActivityDelegate =
      DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)
  override fun onBackPressed() {
    super.onBackPressed()  // RN BackHandler로 이벤트 전달
  }
}
