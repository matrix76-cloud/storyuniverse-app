if(NOT TARGET hermes-engine::libhermes)
add_library(hermes-engine::libhermes SHARED IMPORTED)
set_target_properties(hermes-engine::libhermes PROPERTIES
    IMPORTED_LOCATION "/Users/sungwon/.gradle/caches/8.14.3/transforms/2242209813f1a7c07a563c0d32fac631/transformed/jetified-hermes-android-0.81.0-release/prefab/modules/libhermes/libs/android.arm64-v8a/libhermes.so"
    INTERFACE_INCLUDE_DIRECTORIES "/Users/sungwon/.gradle/caches/8.14.3/transforms/2242209813f1a7c07a563c0d32fac631/transformed/jetified-hermes-android-0.81.0-release/prefab/modules/libhermes/include"
    INTERFACE_LINK_LIBRARIES ""
)
endif()

