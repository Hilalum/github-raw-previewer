#!/bin/bash
cd /Users/mac/Desktop/githubViewer/test_files

echo "Replacing Office Files..."
# Uses Apache POI reliable test data
curl -sL -o test.ppt "https://raw.githubusercontent.com/apache/poi/trunk/test-data/slideshow/simple.ppt"
curl -sL -o test.pptx "https://raw.githubusercontent.com/apache/poi/trunk/test-data/slideshow/simple.pptx"
curl -sL -o test.xlsx "https://raw.githubusercontent.com/apache/poi/trunk/test-data/spreadsheet/Simple.xlsx"

echo "Replacing Audio/Video..."
# Mozilla/MDN actual assets
curl -sL -o test.wav "https://raw.githubusercontent.com/mdn/webaudio-examples/main/audio-basics/outfoxing.wav"
curl -sL -o test.mov "https://raw.githubusercontent.com/mhamlet/video-samples/master/sample.mov"

echo "Replacing Fonts..."
# Adobe Open Source Fonts repo
curl -sL -o test.woff "https://raw.githubusercontent.com/adobe-fonts/source-sans/main/WOFF/TTF/SourceSans3-Regular.woff"
curl -sL -o test.woff2 "https://raw.githubusercontent.com/adobe-fonts/source-sans/main/WOFF2/OTF/SourceSans3-Regular.woff2"
curl -sL -o test.ttf "https://raw.githubusercontent.com/google/fonts/main/ofl/roboto/Roboto-Regular.ttf"
curl -sL -o test.otf "https://raw.githubusercontent.com/adobe-fonts/source-sans/main/OTF/SourceSans3-Regular.otf"

echo "Replacing 3D & Images..."
# Khronos group and standard test data
curl -sL -o test.obj "https://raw.githubusercontent.com/alecjacobson/common-3d-test-models/master/data/cube.obj"
curl -sL -o test.tiff "https://raw.githubusercontent.com/mathiasbynens/small/master/tiff.tiff"

echo "✅ Download complete! Checking sizes to ensure no 14-byte 404s:"
ls -lh test.ppt test.pptx test.xlsx test.wav test.mov test.woff test.woff2 test.ttf test.otf test.obj test.tiff
