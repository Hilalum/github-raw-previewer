import urllib.request
import ssl
import os

print("📥 开始下载真实测试文件...")

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

opener = urllib.request.build_opener(urllib.request.HTTPSHandler(context=ctx))
urllib.request.install_opener(opener)

files = {
    'test.ppt': 'https://file-examples.com/wp-content/storage/2017/08/file_example_PPT_250kB.ppt',
    'test.pptx': 'https://file-examples.com/wp-content/storage/2017/08/file_example_PPT_250kB.pptx',
    'test.xlsx': 'https://file-examples.com/wp-content/storage/2017/02/file_example_XLSX_50.xlsx',
    'test.wav': 'https://file-examples.com/wp-content/storage/2017/11/file_example_WAV_1MG.wav',
    'test.mov': 'https://file-examples.com/wp-content/storage/2018/04/file_example_MOV_480_700kB.mov',
    'test.woff': 'https://raw.githubusercontent.com/w3c/web-platform-tests/master/fonts/woff/IntLft-Italic.woff',
    'test.woff2': 'https://raw.githubusercontent.com/w3c/web-platform-tests/master/fonts/woff/IntLft-Italic.woff',
    'test.ttf': 'https://raw.githubusercontent.com/w3c/web-platform-tests/master/fonts/Ahem.ttf',
    'test.otf': 'https://raw.githubusercontent.com/w3c/web-platform-tests/master/fonts/Ahem.otf',
    'test.obj': 'https://raw.githubusercontent.com/CesiumGS/cesium/main/Apps/SampleData/models/CesiumMilkTruck/CesiumMilkTruck.obj',
    'test.tiff': 'https://file-examples.com/wp-content/storage/2017/10/file_example_TIFF_1MB.tiff'
}

for name, url in files.items():
    filepath = os.path.join('/Users/mac/Desktop/githubViewer/test_files', name)
    try:
        print(f"正在拉取 {name} ...")
        urllib.request.urlretrieve(url, filepath)
        size = os.path.getsize(filepath)
        print(f"✅ 成功下载 {name} - 大小: {size} 字节\n")
    except Exception as e:
        print(f"❌ 失败 {name}: {e}\n")

print("✨ 替换完成，请检查文件大小以确认是否生效！")
