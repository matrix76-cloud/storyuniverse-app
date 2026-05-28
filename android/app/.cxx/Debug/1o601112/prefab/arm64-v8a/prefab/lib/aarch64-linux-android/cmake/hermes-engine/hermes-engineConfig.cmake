if(NOT TARGET hermes-engine::libhermes)
add_library(hermes-engine::libhermes SHARED IMPORTED)
set_target_properties(hermes-engine::libhermes PROPERTIES
    IMPORTED_LOCATION "/Users/sungwon/.gradle/caches/8.14.3/transforms/3dded0e146eef2ee2363e367fcf8421b/transformed/jetified-hermes-android-0.81.0-debug/prefab/modules/libhermes/libs/android.arm64-v8a/libhermes.so"
    INTERFACE_INCLUDE_DIRECTORIES "/Users/sungwon/.gradle/caches/8.14.3/transforms/3dded0e146eef2ee2363e367fcf8421b/transformed/jetified-hermes-android-0.81.0-debug/prefab/modules/libhermes/include"
    INTERFACE_LINK_LIBRARIES ""
)
endif()

