import urllib.request
import ssl
import os

print("📥 开始下载最新真实测试文件...")

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

opener = urllib.request.build_opener(urllib.request.HTTPSHandler(context=ctx))
opener.addheaders = [('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)')]
urllib.request.install_opener(opener)

# All completely different, highly-stable open-source links
files = {
    'test.ppt': 'https://s29.q4cdn.com/175625835/files/doc_downloads/test.ppt',
    'test.pptx': 'https://freetestdata.com/wp-content/uploads/2021/09/100KB_PPTX.pptx',
    'test.xlsx': 'https://freetestdata.com/wp-content/uploads/2021/09/50KB_Xlsx.xlsx',
    'test.wav': 'https://freetestdata.com/wp-content/uploads/2021/09/100-KB-WAV.wav',
    'test.mov': 'https://freetestdata.com/wp-content/uploads/2022/02/Free_Test_Data_100KB_MOV.mov',
    'test.woff': 'https://raw.githubusercontent.com/mdn/learning-area/master/css/styling-text/web-fonts/webfont-sample-pages/bitter-regular-webfont.woff',
    'test.woff2': 'https://raw.githubusercontent.com/mdn/learning-area/master/css/styling-text/web-fonts/webfont-sample-pages/bitter-regular-webfont.woff2',
    'test.otf': 'https://raw.githubusercontent.com/adobe-fonts/source-code-pro/release/OTF/SourceCodePro-Regular.otf',
    'test.obj': 'https://raw.githubusercontent.com/intel/tinyobjloader/master/models/cube.obj',
    'test.tiff': 'https://freetestdata.com/wp-content/uploads/2021/09/Free_Test_Data_100KB_TIFF.tiff'
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
