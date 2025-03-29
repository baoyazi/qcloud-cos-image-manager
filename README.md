
# qcloud-cos-image-manager


### 产品介绍

----

qcloud-cos-image-manager 是一款专为腾讯云对象存储（COS）打造的高效图片管理工具。

只需指定一个文件夹，它就能瞬间将其转化为功能强大的图床，为您提供直观、便捷的图片管理体验。

|       |  |
| ----------- | ----------- |
| 一键上传，快速部署      | 标签管理，分类有序      |
| 批量上传，轻松管理   | 链接复制，即用即取        |


##### 腾讯云对象存储（COS）

腾讯云对象存储（Cloud Object Storage，COS）是腾讯云提供的一种存储海量文件的分布式存储服务
用户可通过网络随时存储和查看数据。

COS 具有高扩展性、低成本、可靠安全等优点，适合存储各种文件类型，特别适合图片、视频等多媒体文件存储。


访问 COS 官网：https://cloud.tencent.com/product/cos

查看 COS 计费说明：https://cloud.tencent.com/document/product/436/6240

##### 软件平台支持



 macOS 版本 - 稳定流畅，完美适配macOS系统

 Windows 版本 - 性能优化，兼容各版本Windows系统

https://github.com/baoyazi/qcloud-cos-image-manager/releases

##### 我们提供付费版本
我们同时提供开源版本，您可以自由下载、修改和部署



### 开源版本安装

------

整个CORE代码就2000行左右，很简单的。一个html单页即可。因为同源策略，文件模式获取不到api的。所以要搭建到服务器上。

以为Python为例子,创建default文件：
```
from flask import Flask, render_template

app = Flask(__name__)

@app.route('/')
def home():
    return render_template('manager.html')

if __name__ == '__main__':
    app.run(debug=True)
```

windows客户端打包：
```
pyinstaller --onefile --windowed --icon=qcloud-cos-image-manager.ico  --name "qcim" default.py
```
macOS客户端打包，原生版本：
```
只需修改代码文件的 WebView(url: URL(string: "https://www.example.com/")!) 为自己的地址即可
```
macOS客户端打包，Python打包版本：
```
pyinstaller --onefile --windowed --icon=qcloud-cos-image-manager.ico  --name "qcim" default.py
```


### 联系方式

------
实在麻烦，买我的9.9元激活码，用我的打包版本，支持一下。

官网：https://www.dengzilou.com/tool/qcloud-cos-image-manager
邮箱📫：dengzilou@dengzilou.com 

##### 版本对比
|   功能特性    | 付费版  | 开源版 |
| ----------- | ----------- | ----------- |
| 功能完整性      | ✓      | ✓  |
| 技术支持   | ✓        | ✗  |
| 定期更新   | ✓        | ✗  |
| 自定义修改   | ✗        | ✓  |


