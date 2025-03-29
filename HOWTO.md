
<h1 align="center">qcloud-cos-image-manager</h1>

## 使用手册

快速上手：腾讯云 COS 图片管理工具 - qcloud-cos-image-manager

### 1. 开通腾讯云 COS 服务
已通过腾讯云账号开通 COS 服务。对象存储（Cloud Object Storage，COS）是腾讯云提供的一种存储海量文件的分布式存储服务，用户可通过网络随时存储和查看数据。腾讯云 COS 使所有用户都能使用具备高扩展性、低成本、可靠和安全的数据存储服务。

📦说明：

若无腾讯云账号，可参见 账号相关文档 进行创建。
若未开通 COS 服务，请前往 COS 控制台，按照提示进行开通。

### 2. 了解 COS 基本概念
📦初次使用 COS，建议您先了解以下基本概念：

存储桶（Bucket）：是对象的载体，可理解为存放对象的“容器”。一个存储桶可容纳无数个对象。
地域（Region）：是腾讯云托管机房的分布地区，对象存储 COS 的数据存放在这些地域的存储桶中。
文件夹路径：是对象存储的基本单元，可理解为任何格式类型的数据，例如图片、文档和音视频文件等。

### 3. 创建 API KEY
📦说明：

进入 [控制台 > 立即接入](https://console.cloud.tencent.com/cam/capi)管理，单击创建 API KEY。获取密钥ID (SecretId)和密钥Key (SecretKey)。



### 4. 使用我们 qcloud-cos-image-manager 软件
📦登录我们系统后，填写以下5个参数：

**SecretId**：API 访问密钥 ID。例如：`AKertotmXertertetH1bzwpafdR6b0F`

**SecretKey**：API 访问密钥 Key。例如：`XertertetH1bzwpafdR6b0F`

**Bucket**：存储桶名称。例如：`dengzilou-1222381116`

**Region**：存储桶所在的地域。例如：`ap-guangzhou`

**Folder Path**：文件夹路径。(自己指定存放图片的文件夹) 例如：`/images`


### 参考网址
📦参考网址：

COSBrowser 快速入门 https://cloud.tencent.com/document/product/436/40762
API KEY 管理 https://cloud.tencent.com/document/product/1772/115970