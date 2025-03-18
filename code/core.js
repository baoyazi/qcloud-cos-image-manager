
// Cookie管理工具
const cookieManager = {
    set: (name, value, days = 180) => {
        try {
            const encoded = encodeURIComponent(btoa(encodeURIComponent(value)));
            const date = new Date();
            date.setTime(Date.now() + (days * 86400000));
            
            document.cookie = [
                `${name}=${encoded}`,
                `expires=${date.toUTCString()}`,
                "path=/",
                location.protocol === 'https:' ? 'Secure; SameSite=None' : 'SameSite=Lax'
            ].join('; ');
            return true;
        } catch (e) {
            console.error(`[Cookie] 设置 ${name} 失败:`, e);
            return false;
        }
    },

    get: (name) => {
        try {
            const cookie = document.cookie
                .split(';')
                .find(c => c.trim().startsWith(`${name}=`));
                
            return cookie 
                ? decodeURIComponent(atob(decodeURIComponent(cookie.split('=')[1])))
                : null;
        } catch (e) {
            console.error(`[Cookie] 读取 ${name} 失败:`, e);
            return null;
        }
    },

    remove: (name) => {
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
    }
};

// COS客户端实例
let cosClient = null;

// 登录相关函数
async function handleLogin(event) {
    event.preventDefault();
    
    const config = {
        Bucket: document.getElementById('bucket').value,
        Region: document.getElementById('region').value,
        SecretId: document.getElementById('secretId').value,
        SecretKey: document.getElementById('secretKey').value,
        Folder: document.getElementById('folder').value
    };

    // 初始化COS客户端
    cosClient = new COS({
        SecretId: config.SecretId,
        SecretKey: config.SecretKey
    });

    try {
        // 检查存储桶是否存在
        await cosClient.headBucket({
            Bucket: config.Bucket,
            Region: config.Region
        });

        // 保存配置到Cookie
        cookieManager.set('cos_bucket', config.Bucket);
        cookieManager.set('cos_region', config.Region);
        cookieManager.set('cos_secret_id', config.SecretId); 
        cookieManager.set('cos_secret_key', config.SecretKey);
        cookieManager.set('cos_folder', config.Folder);

        // 切换界面显示
        document.getElementById('loginContainer').classList.add('hidden');
        document.getElementById('mainContainer').classList.remove('hidden');
        
        // 加载图片列表
        loadImageList(config);
        // 加载标签列表
        loadTagList(config);
    } catch (err) {
        // 连接失败提示
        showToast('连接失败，请检查您的输入信息并重试。', 'error');
    }
}

function handleLogout() {
    ['cos_bucket', 'cos_region', 'cos_secret_id', 'cos_secret_key', 'cos_folder'].forEach(name => {
        cookieManager.remove(name);
    });
    location.reload();
}

// 页面初始化
window.onload = function() {
    const savedBucket = cookieManager.get('cos_bucket');
    if(savedBucket) {
        const config = {
            Bucket: savedBucket,
            Region: cookieManager.get('cos_region'),
            SecretId: cookieManager.get('cos_secret_id'),
            SecretKey: cookieManager.get('cos_secret_key'),
            Folder: cookieManager.get('cos_folder')
        };

        // 初始化COS客户端
        cosClient = new COS({
            SecretId: config.SecretId,
            SecretKey: config.SecretKey
        });

        // 切换界面
        document.getElementById('loginContainer').classList.add('hidden');
        document.getElementById('mainContainer').classList.remove('hidden');
        loadImageList(config);
        loadTagList(config);
    }
}

// 图片列表相关函数
async function loadImageList(config) {
    try {
        const { Contents } = await cosClient.getBucket({
            Bucket: cookieManager.get('cos_bucket'),
            Region: cookieManager.get('cos_region'),
            Prefix: cookieManager.get('cos_folder')
        });

        const container = document.getElementById('imageContainer');
        container.innerHTML = '';

        // 按时间倒序排序并去除不是图片的元素
        const sortedContents = Contents
            .filter(item => isImageFile(item.Key))
            .sort((a, b) => {
                return new Date(b.LastModified) - new Date(a.LastModified);
            });

        // 分页功能
        const itemsPerPage = 15;
        let currentPage = 1;
        const totalPages = Math.ceil(sortedContents.length / itemsPerPage);

        function renderPage(page) {
            container.innerHTML = '';
            const start = (page - 1) * itemsPerPage;
            const end = start + itemsPerPage;
            const pageContents = sortedContents.slice(start, end);

            pageContents.forEach(item => {
                if (!item.Key.endsWith('/') && isImageFile(item.Key)) {
                    createImageItem(item.Key, config);
                }
            });

            // 更新分页控件
            document.getElementById('pagination').innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <button onclick="changePage(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''}>上一页</button>
                        <span>第 ${currentPage} 页，共 ${totalPages} 页</span>
                        <button onclick="changePage(${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''}>下一页</button>
                    </div>
                    <div>
                        <input type="number" id="pageInput" min="1" max="${totalPages}" value="${currentPage}">
                        <button onclick="jumpToPage()">跳转</button>
                        <span>共 ${totalPages} 页</span>
                    </div>
                </div>
            `;
        }
        document.getElementById('tag-container').innerHTML = `<span style="margin-left: 20px;">全部图片</span>`;
        window.changePage = function(page) {
            if (page >= 1 && page <= totalPages) {
                currentPage = page;
                renderPage(page);
            }
        }

        window.jumpToPage = function() {
            const pageInput = document.getElementById('pageInput').value;
            const pageNumber = parseInt(pageInput, 10);
            if (pageNumber >= 1 && pageNumber <= totalPages) {
                currentPage = pageNumber;
                renderPage(pageNumber);
            }
        }

        renderPage(currentPage);
    } catch (err) {
        alert('获取列表失败: ' + err.message);
    }
};

function isImageFile(filename) {
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp','svg'];
    return imageExtensions.some(ext => filename.toLowerCase().endsWith(ext));
};

function createImageItem(key, config) {
    const url = `https://${config.Bucket}.cos.${config.Region}.myqcloud.com/${key}`;
    
    const item = document.createElement('div');
    item.className = 'image-item';
    item.innerHTML = `
        <img src="${url}" class="image-preview" onclick="viewImage('${url}', '${key}')">
        <div class="image-name">${key.split('/').pop()}</div>
        <div class="controls">
            <button class="view-btn" onclick="viewImage('${url}', '${key}')">查看</button>
            <button class="delete-btn" onclick="showModal('删除图片', '确定删除当前图片吗？', () => deleteImage('${key}'))">删除</button>
        </div>
    `;
    
    document.getElementById('imageContainer').appendChild(item);
};
    
// 图片操作相关函数
async function viewImage(url, key) {
    const offcanvas = document.getElementById('previewOffcanvas');
    const backdrop = document.querySelector('.offcanvas-backdrop');
    
    // 显示加载状态
    document.getElementById('previewImage').src = '';
    document.getElementById('meta-filename').textContent = '加载中...';
    document.getElementById('meta-dimension').textContent = '加载中...';
    
    // 显示预览
    offcanvas.classList.add('active');
    backdrop.classList.add('active');

    try {
        // 获取图片元数据
        const filename = key.split('/').pop();
        document.getElementById('meta-filename').textContent = filename;
        document.getElementById('meta-type').textContent = filename.split('.').pop().toUpperCase();

        // 获取图片尺寸
        const img = new Image();
        img.src = url;
        
        await new Promise((resolve) => {
            img.onload = () => {
                document.getElementById('meta-dimension').textContent = 
                    `${img.naturalWidth} × ${img.naturalHeight}`;
                document.getElementById('previewImage').src = url;
                resolve();
            };
            img.onerror = () => {
                document.getElementById('previewImage').src = 'data:image/svg+xml,...';
                throw new Error('图片加载失败');
            };
        });

        // 获取COS元数据
        const { headers } = await cosClient.headObject({
            Bucket: cookieManager.get('cos_bucket'),
            Region: cookieManager.get('cos_region'),
            Key: key,
        });

        const uploadTime = headers['last-modified'];
        
        const { Tags } = await cosClient.getObjectTagging({
            Bucket: cookieManager.get('cos_bucket'),
            Region: cookieManager.get('cos_region'),
            Key: key
        });
        const tags = Tags.map(tag => tag.Key).join(',') || '';

        // 更新界面
        document.getElementById('meta-uploadtime').textContent = 
            new Date(uploadTime).toLocaleString();
        document.getElementById('meta-tags').value = tags;
        document.getElementById('meta-downloadurl').value = url;
        document.getElementById('meta-serverurl').value = `${window.location.origin}/worker/document/image?url=${url}&width=300`;
        
        // 保存key供updateTags使用
        document.getElementById('meta-tags').dataset.key = key;

        // 加载所有标签和图片所属标签
        loadAllTags();
        loadImageTags(key);
    } catch (err) {
        console.error('获取详情失败:', err);
        showToast('获取图片详情失败', 'error');
    }
};
function closePreview() {
    document.getElementById('previewOffcanvas').classList.remove('active');
    document.getElementById('usageInstructions').classList.remove('active');
    document.getElementById('versionIntroduction').classList.remove('active');
    document.querySelector('.offcanvas-backdrop').classList.remove('active');
};
async function deleteImage(key) {
    try {
        const config = {
            Bucket: cookieManager.get('cos_bucket'),
            Region: cookieManager.get('cos_region'),
            Folder: cookieManager.get('cos_folder')
        };

        await cosClient.deleteObject({
            Bucket: config.Bucket,
            Region: config.Region,
            Key: key
        });

        // 获取tag.json数据
        const { Body } = await cosClient.getObject({
            Bucket: config.Bucket,
            Region: config.Region,
            Key: `${config.Folder}tag.json`
        });
        const tagData = JSON.parse(Body.toString());

        // 遍历tagData，删除对应的key
        tagData.forEach(tag => {
            tag.imageFiles = tag.imageFiles.filter(imageKey => imageKey !== key);
        });

        // 更新tag.json
        await cosClient.putObject({
            Bucket: config.Bucket,
            Region: config.Region,
            Key: `${config.Folder}tag.json`,
            Body: JSON.stringify(tagData)
        });

        loadImageList(config);
    } catch (err) {
        alert('删除失败: ' + err.message);
    }
}
// 文件上传相关函数
function handleFileSelect() {
    const files = document.getElementById('fileInput').files;
    if (files.length === 0) return;

    [...files].forEach(file => {
        uploadImage(file);
    });
};
async function uploadImage(file) {
    if (!file) return;

    const config = {
        Bucket: cookieManager.get('cos_bucket'),
        Region: cookieManager.get('cos_region'),
        Folder: cookieManager.get('cos_folder')
    };

    // 验证文件
    if (!file.type.startsWith('image/')) {
        alert('请选择图片文件');
        return;
    }

    if (file.size > 10 * 1024 * 1024) {
        alert('文件大小不能超过10MB');
        return;
    }

    const ext = file.name.split('.').pop().toLowerCase();
    const newFileName = `${config.Folder}${Date.now()}-${Math.random().toString(36).slice(-6)}.${ext}`;

    // 显示进度
    const progressBar = document.getElementById('uploadProgress');
    const progress = progressBar.querySelector('.progress');
    const status = document.getElementById('uploadStatus');
    
    progressBar.classList.remove('hidden');
    status.textContent = '准备上传...';

    try {
        await cosClient.uploadFile({
            Bucket: config.Bucket,
            Region: config.Region,
            Key: newFileName,
            Body: file,
            onProgress: function(progressData) {
                const percent = Math.round(progressData.percent * 100);
                progress.style.width = `${percent}%`;
                status.textContent = `上传中: ${percent}%`;
            }
        });

        status.textContent = '上传成功';
        setTimeout(() => {
            progressBar.classList.add('hidden');
            status.textContent = '';
            progress.style.width = '0%';
        }, 2000);

        loadImageList(config);
    } catch (err) {
        status.textContent = '上传失败: ' + err.message;
        setTimeout(() => {
            progressBar.classList.add('hidden');
            status.textContent = '';
            progress.style.width = '0%';
        }, 3000);
    }
};
// 拖拽上传
document.addEventListener('DOMContentLoaded', () => {
    const uploadContainer = document.querySelector('.upload-container');

    uploadContainer.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
        uploadContainer.style.backgroundColor = '#f0f0f0';
    });

    uploadContainer.addEventListener('dragleave', (e) => {
        e.preventDefault();
        e.stopPropagation();
        uploadContainer.style.backgroundColor = '';
    });

    uploadContainer.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        uploadContainer.style.backgroundColor = '';

        const files = e.dataTransfer.files;
        if (files.length > 0) {
            [...files].forEach(file => {
                uploadImage(file);
            });
        }
    });
});
// 标签相关函数
function showTagForm() {
    document.getElementById('tag-form').style.display = 'block';
}
function closeTagForm() {
    document.getElementById('tag-form').style.display = 'none';
}
async function addTag() {
    const newTagName = document.getElementById('newTagName').value.trim();
    if (!newTagName) {
        alert('请输入标签名称');
        return;
    }

    const config = {
        Bucket: cookieManager.get('cos_bucket'),
        Region: cookieManager.get('cos_region'),
        Folder: cookieManager.get('cos_folder')
    };

    try {
        // 获取现有的tag.json文件内容
        let tagData = [];
        try {
            const { Body } = await cosClient.getObject({
                Bucket: config.Bucket,
                Region: config.Region,
                Key: `${config.Folder}tag.json`
            });
            tagData = JSON.parse(Body.toString());
        } catch (err) {
            if (err.statusCode !== 404) {
                throw err;
            }
        }

        // 更新tag.json文件内容
        const newTag = {
            name: newTagName,
            key: `${config.Folder}tag-${Date.now()}`,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            imageFiles: []
        };
        tagData.push(newTag);

        await cosClient.putObject({
            Bucket: config.Bucket,
            Region: config.Region,
            Key: `${config.Folder}tag.json`,
            Body: JSON.stringify(tagData)
        });

        // 更新标签列表显示
        loadTagList(config);

        // 清空表单
        document.getElementById('newTagName').value = '';
        document.getElementById('tag-form').style.display = 'none';
    } catch (err) {
        alert('添加标签失败: ' + err.message);
    }
}

async function loadTagList(config) {
    try {
        const { Body } = await cosClient.getObject({
            Bucket: config.Bucket,
            Region: config.Region,
            Key: `${config.Folder}tag.json`
        });
        const tagData = JSON.parse(Body.toString());

        const tagList = document.getElementById('tag-list');
        tagList.innerHTML = '';

        // 添加消除标签显示按钮
        const clearTagButton = document.createElement('button');
        clearTagButton.className = 'tag-item all-tag-btn';
        clearTagButton.textContent = '全部图片';
        clearTagButton.addEventListener('click', () => loadImageList(config));
        tagList.appendChild(clearTagButton);

        tagData.forEach(tag => {
            const tagItem = document.createElement('div');
            tagItem.className = 'tag-item';
            tagItem.draggable = true;
            tagItem.dataset.key = tag.key;
            tagItem.innerHTML = `<span class="tag-name" style="color: #333; margin-right: 8px;font-size: 13px;">${tag.name}</span>`;
            tagItem.addEventListener('dragstart', handleDragStart);
            tagItem.addEventListener('dragend', handleDragEnd);
            tagItem.addEventListener('click', () => filterImagesByTag(tag.key,tag.name));
            tagList.appendChild(tagItem);
        });

    } catch (err) {
        if (err.statusCode !== 404) {
            alert('加载标签列表失败: ' + err.message);
        }
    }
}

async function loadAllTags() {
    try {
        const { Body } = await cosClient.getObject({
            Bucket: cookieManager.get('cos_bucket'),
            Region: cookieManager.get('cos_region'),
            Key: `${cookieManager.get('cos_folder')}tag.json`
        });
        const tagData = JSON.parse(Body.toString());

        const allTags = document.getElementById('all-tags');
        allTags.innerHTML = '';

        tagData.forEach(tag => {
            const tagItem = document.createElement('div');
            tagItem.className = 'tag-item';
            tagItem.draggable = true;
            tagItem.dataset.key = tag.key;
            tagItem.innerHTML = `<span class="tag-name" style="color: #333; margin-right: 8px;font-size: 13px;">${tag.name}</span>`;
            tagItem.addEventListener('dragstart', handleDragStart);
            tagItem.addEventListener('dragend', handleDragEnd);
            tagItem.addEventListener('click', () => handleTagClick(tag.key));
            allTags.appendChild(tagItem);
        });
    } catch (err) {
        if (err.statusCode !== 404) {
            alert('加载所有标签失败: ' + err.message);
        }
    }
}

async function loadImageTags(key) {
    try {
        const { Body } = await cosClient.getObject({
            Bucket: cookieManager.get('cos_bucket'),
            Region: cookieManager.get('cos_region'),
            Key: `${cookieManager.get('cos_folder')}tag.json`
        });
        const tagData = JSON.parse(Body.toString());

        const imageTags = document.getElementById('image-tags');
        imageTags.innerHTML = '';

        tagData.forEach(tag => {
            if (tag.imageFiles.includes(key)) {
                const tagItem = document.createElement('div');
                tagItem.className = 'tag-item';
                tagItem.draggable = true;
                tagItem.dataset.key = tag.key;
                tagItem.innerHTML = `<span class="tag-name" style="color: #333; margin-right: 8px;font-size: 13px;">${tag.name}</span>`;
                tagItem.addEventListener('dragstart', handleDragStart);
                tagItem.addEventListener('dragend', handleDragEnd);
                tagItem.addEventListener('click', () => handleTagClick(tag.key));
                imageTags.appendChild(tagItem);
            }
        });
    } catch (err) {
        if (err.statusCode !== 404) {
            alert('加载图片标签失败: ' + err.message);
        }
    }
}

function handleDragStart(e) {
    e.dataTransfer.setData('text/plain', e.target.dataset.key);
    e.target.classList.add('dragging');
}

function handleDragEnd(e) {
    e.target.classList.remove('dragging');
}

document.getElementById('image-tags').addEventListener('dragover', (e) => {
    e.preventDefault();
});

document.getElementById('image-tags').addEventListener('drop', async (e) => {
    e.preventDefault();
    const tagKey = e.dataTransfer.getData('text/plain');
    const imageKey = document.getElementById('meta-tags').dataset.key;

    try {
        const { Body } = await cosClient.getObject({
            Bucket: cookieManager.get('cos_bucket'),
            Region: cookieManager.get('cos_region'),
            Key: `${cookieManager.get('cos_folder')}tag.json`
        });
        const tagData = JSON.parse(Body.toString());

        const tag = tagData.find(t => t.key === tagKey);
        if (!tag.imageFiles.includes(imageKey)) {
            tag.imageFiles.push(imageKey);
        }

        await cosClient.putObject({
            Bucket: cookieManager.get('cos_bucket'),
            Region: cookieManager.get('cos_region'),
            Key: `${cookieManager.get('cos_folder')}tag.json`,
            Body: JSON.stringify(tagData)
        });

        loadImageTags(imageKey);
    } catch (err) {
        alert('添加标签失败: ' + err.message);
    }
});

document.getElementById('all-tags').addEventListener('dragover', (e) => {
    e.preventDefault();
});

document.getElementById('all-tags').addEventListener('drop', async (e) => {
    e.preventDefault();
    const tagKey = e.dataTransfer.getData('text/plain');
    const imageKey = document.getElementById('meta-tags').dataset.key;

    try {
        const { Body } = await cosClient.getObject({
            Bucket: cookieManager.get('cos_bucket'),
            Region: cookieManager.get('cos_region'),
            Key: `${cookieManager.get('cos_folder')}tag.json`
        });
        const tagData = JSON.parse(Body.toString());

        const tag = tagData.find(t => t.key === tagKey);
        const index = tag.imageFiles.indexOf(imageKey);
        if (index > -1) {
            tag.imageFiles.splice(index, 1);
        }

        await cosClient.putObject({
            Bucket: cookieManager.get('cos_bucket'),
            Region: cookieManager.get('cos_region'),
            Key: `${cookieManager.get('cos_folder')}tag.json`,
            Body: JSON.stringify(tagData)
        });

        loadImageTags(imageKey);
    } catch (err) {
        alert('删除标签失败: ' + err.message);
    }
});

async function filterImagesByTag(tagKey,tag_name) {
    try {
        const { Body } = await cosClient.getObject({
            Bucket: cookieManager.get('cos_bucket'),
            Region: cookieManager.get('cos_region'),
            Key: `${cookieManager.get('cos_folder')}tag.json`
        });
        const tagData = JSON.parse(Body.toString());

        const tag = tagData.find(t => t.key === tagKey);
        if (!tag) return;

        const container = document.getElementById('imageContainer');
        container.innerHTML = '';

        const sortedContents = tag.imageFiles.sort((a, b) => {
            return new Date(b.LastModified) - new Date(a.LastModified);
        });

        // 分页功能
        const itemsPerPage = 15;
        let currentPage = 1;
        const totalPages = Math.ceil(sortedContents.length / itemsPerPage);

        function renderPage(page) {
            container.innerHTML = '';
            const start = (page - 1) * itemsPerPage;
            const end = start + itemsPerPage;
            const pageContents = sortedContents.slice(start, end);

            pageContents.forEach(key => {
                createImageItem(key, {
                    Bucket: cookieManager.get('cos_bucket'),
                    Region: cookieManager.get('cos_region')
                });
            });

            // 更新分页控件
            document.getElementById('pagination').innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <button onclick="changePage(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''}>上一页</button>
                        <span>第 ${currentPage} 页，共 ${totalPages} 页</span>
                        <button onclick="changePage(${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''}>下一页</button>
                    </div>
                    <div>
                        <input type="number" id="pageInput" min="1" max="${totalPages}" value="${currentPage}">
                        <button onclick="jumpToPage()">跳转</button>
                        <span>共 ${totalPages} 页</span>
                    </div>
                </div>
            `;
        }

        document.getElementById('tag-container').innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px; border: 1px solid #e0e0e0; border-radius: 8px;margin: 10px;background:#FAFCFF;">
            <div>
                <span style="font-size: 16px; font-weight: bold; color: #333;cursor: pointer;color: #409EFF;" onmouseover="this.style.color='rgb(51.2, 126.4, 204)'" onmouseout="this.style.color='#409EFF'" onclick="document.getElementsByClassName('all-tag-btn')[0].click()">全部图片 </span> <span>  ›  </span>
                <span style="font-size: 16px; font-weight: bold; color: #333;">${tag_name}</span>
            </div>
            <div style="display: flex; gap: 10px;">
                <div id="edit-tag-form" style="display: none; gap: 5px; justify-content: center;align-items: center;padding: 4px 12px;background: #f9f9f9;border: 1px solid #e0e0e0;border-radius: 8px;position: relative;">
                    <span style="background: #ff4d4f; color: white; border: none; border-radius: 50%; cursor: pointer; transition: background 0.3s;width: 20px;height: 20px;text-align: center;display:inline-block;position: absolute;right: -8px;top: -8px;" onclick="closeEditTag('${tagKey}')">X</span>
                    <input type="text" id="updateTagName" value="${tag_name}" placeholder="输入新标签名称" style="padding: 8px; border: 1px solid #d9d9d9; border-radius: 4px;">
                    <button style="padding: 8px 12px; background: #52c41a; color: white; border: none; border-radius: 4px; cursor: pointer; transition: background 0.3s;" onclick="updateTag('${tagKey}')">更新标签名称</button>
                </div>
                <button class="box-btn" style="font-weight: 100;height: 30px;" onclick="editTag('${tagKey}')">修改标签名称</button>
                <button class="box-btn" style="font-weight: 100;color: gray;height: 30px;" onclick="showModal('删除标签', '确定删除当前标签吗？', () => deleteTag('${tagKey}'))">删除当前标签</button>
            </div>
        </div>
        `;

        window.changePage = function(page) {
            if (page >= 1 && page <= totalPages) {
                currentPage = page;
                renderPage(page);
            }
        }

        window.jumpToPage = function() {
            const pageInput = document.getElementById('pageInput').value;
            const pageNumber = parseInt(pageInput, 10);
            if (pageNumber >= 1 && pageNumber <= totalPages) {
                currentPage = pageNumber;
                renderPage(pageNumber);
            }
        }

        renderPage(currentPage);
    } catch (err) {
        alert('根据标签过滤图片失败: ' + err.message);
    }
}
async function closeEditTag(tagKey) {
    document.getElementById('edit-tag-form').style.display = 'none';
}
async function editTag(tagKey) {
    document.getElementById('edit-tag-form').style.display = 'flex';
}
async function updateTag(tagKey) {
    try {
        const newTagName = document.getElementById('updateTagName').value.trim();
        if (!newTagName) {
            alert('标签名称不能为空');
            return;
        }

        const { Body } = await cosClient.getObject({
            Bucket: cookieManager.get('cos_bucket'),
            Region: cookieManager.get('cos_region'),
            Key: `${cookieManager.get('cos_folder')}tag.json`
        });

        let tagData = JSON.parse(Body.toString());
        const tag = tagData.find(t => t.key === tagKey);
        if (!tag) {
            alert('未找到标签');
            return;
        }

        tag.name = newTagName;
        await cosClient.putObject({
            Bucket: cookieManager.get('cos_bucket'),
            Region: cookieManager.get('cos_region'),
            Key: `${cookieManager.get('cos_folder')}tag.json`,
            Body: JSON.stringify(tagData)
        });

        document.getElementById('edit-tag-form').style.display = 'none';
        showToast('标签更新成功', 'success');
        filterImagesByTag(tagKey, newTagName);
        loadTagList({
            Bucket: cookieManager.get('cos_bucket'),
            Region: cookieManager.get('cos_region'),
            Folder: cookieManager.get('cos_folder')
        });
        loadImageTags(tagKey);
        filterImagesByTag(tagKey,newTagName);
    } catch (err) {
        alert('更新标签失败: ' + err.message);
    }
}

async function handleTagClick(tagKey) {
    const imageKey = document.getElementById('meta-tags').dataset.key;

    try {
        const { Body } = await cosClient.getObject({
            Bucket: cookieManager.get('cos_bucket'),
            Region: cookieManager.get('cos_region'),
            Key: `${cookieManager.get('cos_folder')}tag.json`
        });
        const tagData = JSON.parse(Body.toString());

        const tag = tagData.find(t => t.key === tagKey);
        if (!tag.imageFiles.includes(imageKey)) {
            tag.imageFiles.push(imageKey);
        } else {
            const index = tag.imageFiles.indexOf(imageKey);
            if (index > -1) {
                tag.imageFiles.splice(index, 1);
            }
        }

        await cosClient.putObject({
            Bucket: cookieManager.get('cos_bucket'),
            Region: cookieManager.get('cos_region'),
            Key: `${cookieManager.get('cos_folder')}tag.json`,
            Body: JSON.stringify(tagData)
        });

        loadImageTags(imageKey);
    } catch (err) {
        alert('更新标签失败: ' + err.message);
    }
}

async function deleteTag(tagKey) {
    try {
        const { Body } = await cosClient.getObject({
            Bucket: cookieManager.get('cos_bucket'),
            Region: cookieManager.get('cos_region'),
            Key: `${cookieManager.get('cos_folder')}tag.json`
        });
        let tagData = JSON.parse(Body.toString());

        tagData = tagData.filter(tag => tag.key !== tagKey);

        await cosClient.putObject({
            Bucket: cookieManager.get('cos_bucket'),
            Region: cookieManager.get('cos_region'),
            Key: `${cookieManager.get('cos_folder')}tag.json`,
            Body: JSON.stringify(tagData)
        });
        loadTagList({   
            Bucket: cookieManager.get('cos_bucket'),
            Region: cookieManager.get('cos_region'),
            Folder: cookieManager.get('cos_folder')
        });
        loadImageList({
            Bucket: cookieManager.get('cos_bucket'),
            Region: cookieManager.get('cos_region'),
            Folder: cookieManager.get('cos_folder')
        });
    } catch (err) {
        alert('删除标签失败: ' + err.message);
    }
}
// 工具函数
function copyDownloadUrl() {
    const downloadUrl = document.getElementById('meta-downloadurl').value;
    navigator.clipboard.writeText(downloadUrl);
    alert('下载地址已复制到剪贴板');
}

function copyServerUrl() {
    const serverUrl = document.getElementById('meta-serverurl').value;
    navigator.clipboard.writeText(serverUrl);
    alert('服务器图片缓存地址已复制到剪贴板');
}

function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        padding: 12px 24px;
        border-radius: 4px;
        color: white;
        z-index: 9999;
        background: ${type === 'success' ? '#52c41a' : type === 'error' ? '#ff4d4f' : '#1890ff'};
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

function showModal(title, message, confirmCallback) {
    // Create modal elements
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
    `;

    const modalContent = document.createElement('div');
    modalContent.style.cssText = `
        background: white;
        padding: 20px;
        border-radius: 8px;
        min-width: 300px;
        max-width: 500px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    `;

    const modalHeader = document.createElement('div');
    modalHeader.style.cssText = `
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 15px;
        padding-bottom: 10px;
        border-bottom: 1px solid #eee;
    `;

    const modalTitle = document.createElement('h3');
    modalTitle.style.cssText = `
        margin: 0;
        font-size: 18px;
        color: #333;
    `;
    modalTitle.textContent = title;

    const closeButton = document.createElement('button');
    closeButton.style.cssText = `
        background: none;
        border: none;
        font-size: 20px;
        cursor: pointer;
        color: #666;
    `;
    closeButton.innerHTML = '&times;';
    closeButton.onclick = () => modal.remove();

    const modalBody = document.createElement('div');
    modalBody.style.cssText = `
        margin-bottom: 20px;
        color: #666;
    `;
    modalBody.textContent = message;

    const modalFooter = document.createElement('div');
    modalFooter.style.cssText = `
        display: flex;
        justify-content: flex-end;
        gap: 10px;
    `;

    const confirmButton = document.createElement('button');
    confirmButton.style.cssText = `
        padding: 8px 16px;
        background: #409EFF;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
    `;
    confirmButton.textContent = '确认';
    confirmButton.onclick = () => {
        if (confirmCallback) confirmCallback();
        modal.remove();
    };

    const cancelButton = document.createElement('button');
    cancelButton.style.cssText = `
        padding: 8px 16px;
        background: #f5f5f5;
        color: #666;
        border: none;
        border-radius: 4px;
        cursor: pointer;
    `;
    cancelButton.textContent = '取消';
    cancelButton.onclick = () => modal.remove();

    // Assemble modal
    modalHeader.appendChild(modalTitle);
    modalHeader.appendChild(closeButton);
    modalFooter.appendChild(cancelButton);
    modalFooter.appendChild(confirmButton);
    
    modalContent.appendChild(modalHeader);
    modalContent.appendChild(modalBody);
    modalContent.appendChild(modalFooter);
    modal.appendChild(modalContent);

    // Add to document
    document.body.appendChild(modal);
}
function showOffcanvas(title, content, id) {
    // Create offcanvas elements
    const offcanvas = document.createElement('div');
    offcanvas.className = 'offcanvas';
    offcanvas.id = id;
    offcanvas.style.cssText = `
        position: fixed;
        top: 0;
        right: -800px;
        width: 800px;
        height: 100%;
        background: white;
        box-shadow: -2px 0 8px rgba(0,0,0,0.15);
        transition: right 0.3s;
        z-index: 1050;
    `;

    const offcanvasHeader = document.createElement('div');
    offcanvasHeader.id = `${id}_header`;
    offcanvasHeader.style.cssText = `
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 16px 24px;
        border-bottom: 1px solid #eee;
    `;

    const offcanvasTitle = document.createElement('h3');
    offcanvasTitle.style.cssText = `
        margin: 0;
        font-size: 18px;
        color: #333;
    `;
    offcanvasTitle.textContent = title;

    const closeButton = document.createElement('button');
    closeButton.style.cssText = `
        background: none;
        border: none;
        font-size: 20px;
        cursor: pointer;
        color: #666;
    `;
    closeButton.innerHTML = '&times;';
    
    const backdrop = document.createElement('div');
    backdrop.className = 'offcanvas-backdrop';
    backdrop.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.5);
        opacity: 0;
        transition: opacity 0.3s;
        z-index: 1040;
        display: block;
        cursor: pointer;
    `;
    
    const closeOffcanvas = () => {
        offcanvas.style.right = '-800px';
        backdrop.style.opacity = '0';
        setTimeout(() => {
            offcanvas.remove();
            backdrop.remove();
        }, 300);
    };
    
    closeButton.onclick = closeOffcanvas;
    
    // 点击backdrop也关闭offcanvas
    backdrop.onclick = closeOffcanvas;

    const offcanvasBody = document.createElement('div');
    offcanvasBody.id = `${id}_body`;
    offcanvasBody.style.cssText = `
        padding: 24px;
        height: calc(100% - 65px);
        overflow-y: auto;
    `;
    offcanvasBody.innerHTML = content;

    // Assemble offcanvas
    offcanvasHeader.appendChild(offcanvasTitle);
    offcanvasHeader.appendChild(closeButton);
    offcanvas.appendChild(offcanvasHeader);
    offcanvas.appendChild(offcanvasBody);

    // Add to document
    document.body.appendChild(backdrop);
    document.body.appendChild(offcanvas);

    // Trigger animation
    setTimeout(() => {
        offcanvas.style.right = '0';
        backdrop.style.opacity = '1';
    }, 50);

    return {
        offcanvas,
        backdrop,
        close: closeOffcanvas
    };
}
async function showUsageInstructions(){}
async function showVersionIntroduction(){}

