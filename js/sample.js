import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-app.js";
import { getDatabase, ref, push, set, onValue, remove } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-database.js";

// Firebaseの設定
const firebaseConfig = {
    apiKey: "AIzaSyAIbDeSnXmTeabYBbpSnSbzfojnjG3KKck",
    authDomain: "sample-c0906.firebaseapp.com",
    databaseURL: "https://sample-c0906-default-rtdb.firebaseio.com",
    projectId: "sample-c0906",
    storageBucket: "sample-c0906.appspot.com",
    messagingSenderId: "998441269743",
    appId: "1:998441269743:web:084093f158d1de9339de1a",
    measurementId: "G-8KQZ45QPVP"
};

// Firebaseの初期化
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

document.addEventListener("DOMContentLoaded", function () {
    const toggleFormButton = document.querySelector(".toggle-form-button");
    const formContainer = document.querySelector(".form-container");
    const form = document.getElementById("emergencyForm");
    const submitBtn = document.getElementById("submitBtn");
    const clearBtn = document.getElementById("clearBtn");
    const incidentTypeSelect = document.getElementById("incidentType");
    const rescueDetails = document.getElementById("rescueDetails");
    const peopleCountInput = document.getElementById("peopleCount");
    const unknownPeopleCheckbox = document.getElementById("unknownPeople");
    const openMapBtn = document.getElementById("openMapBtn");

    // フォームの表示/非表示を切り替え
    toggleFormButton.addEventListener("click", function () {
        formContainer.style.display = formContainer.style.display === "none" || formContainer.style.display === "" ? "block" : "none";
    });

    // フォーム送信時の処理を修正
    form.addEventListener("submit", async function (event) {
        event.preventDefault();

        const incidentType = incidentTypeSelect.value;
        const peopleCount = peopleCountInput.value;
        const unknownPeopleChecked = unknownPeopleCheckbox.checked;

        if (incidentType === "要救助者あり" && !(peopleCount || unknownPeopleChecked)) {
            alert("人数欄または「人数不明・複数人」にチェックをつけてください。");
            return;
        }

        try {
            const postData = await getFormData();
            await savePostToFirebase(postData); // 非同期処理の完了を待つ
            form.reset();
            submitBtn.disabled = true;
            submitBtn.classList.add("disabled");
            formContainer.style.display = "none";
        } catch (error) {
            console.error("Error while submitting the form:", error);
        }
    });

    // フォームデータを取得してオブジェクトとして返す（非同期処理）
    async function getFormData() {
        const photoFile = document.getElementById("photo").files[0];
        let photoBase64 = null;

        if (photoFile) {
            photoBase64 = await new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = function (e) {
                    resolve(e.target.result);
                };
                reader.readAsDataURL(photoFile);
            });
        }

        function extractLatLngFromMapLink(mapLink) {
            const regex = /@(-?\d+\.\d+),(-?\d+\.\d+)/;
            const match = mapLink.match(regex);
            return match ? `${match[1]}, ${match[2]}` : '';
        }

        const mapLink = document.getElementById("mapLink").value;
        const latLng = extractLatLngFromMapLink(mapLink);

        return {
            date: new Date().toLocaleString(),
            katakanaName: document.getElementById("katakanaName").value,
            kanjiName: document.getElementById("kanjiName").value,
            organization: document.getElementById("organization").value,
            department: document.getElementById("department").value,
            position: document.getElementById("position").value,
            phone: document.getElementById("phone").value,
            email: document.getElementById("email").value,
            landmark: document.getElementById("landmark").value,
            incidentType: document.getElementById("incidentType").value,
            area: document.getElementById("area").value,
            address: document.getElementById("address").value,
            mapLink: mapLink,
            latLng: latLng,
            photo: photoBase64,
            memo: document.getElementById("memo").value,
            numberOfPeople: unknownPeopleCheckbox.checked ? "不明・複数人" : document.getElementById("peopleCount").value
        };
    }

    // クリアボタンのクリック時の処理
    clearBtn.addEventListener("click", function () {
        form.reset();
        localStorage.removeItem("emergencyFormData");
        submitBtn.disabled = true;
        submitBtn.classList.add("disabled");
    });


    // 「要救助者あり」を選択した際に人数欄を表示する処理
    incidentTypeSelect.addEventListener("change", function () {
        if (incidentTypeSelect.value === "要救助者あり") {
            rescueDetails.style.display = "block";
        } else {
            rescueDetails.style.display = "none";
        }
    });

    // 人数不明チェックボックスが変更されたときの処理
    unknownPeopleCheckbox.addEventListener("change", function () {
        if (unknownPeopleCheckbox.checked) {
            peopleCountInput.disabled = true;
            peopleCountInput.style.backgroundColor = "#d3d3d3"; // グレーアウト
        } else {
            peopleCountInput.disabled = false;
            peopleCountInput.style.backgroundColor = ""; // 元の背景色に戻す
        }
    });

    // フォームの入力要素を取得
    const formInputs = form.querySelectorAll('input, select, textarea');

    // 各入力要素にイベントリスナーを追加
    formInputs.forEach(input => {
        input.addEventListener('input', updateSubmitButtonState);
    });

    // updateSubmitButtonState 関数を修正
    function updateSubmitButtonState() {
        const requiredFields = form.querySelectorAll('[required]');
        let allFieldsFilled = true;

        requiredFields.forEach(field => {
            if (!field.value.trim()) {
                allFieldsFilled = false;
            }
        });

        const incidentType = incidentTypeSelect.value;
        const peopleCount = peopleCountInput.value;
        const unknownPeopleChecked = unknownPeopleCheckbox.checked;

        if (incidentType === "要救助者あり" && !(peopleCount || unknownPeopleChecked)) {
            allFieldsFilled = false;
        }

        submitBtn.disabled = !allFieldsFilled;
        submitBtn.classList.toggle("disabled", !allFieldsFilled);
    }

    // 初期状態でボタンの状態を更新
    updateSubmitButtonState();

    // Google Mapsを開くボタンのクリックイベント
    openMapBtn.addEventListener("click", function () {
        const area = document.getElementById("area").value;
        const address = document.getElementById("address").value;
        const fullAddress = `静岡県下田市 ${area} ${address}`;
        const encodedAddress = encodeURIComponent(fullAddress);
        const googleMapsURL = `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`;
        window.open(googleMapsURL, '_blank'); // 新しいタブで開く
    });

    // Firebaseに投稿を保存する関数
    async function savePostToFirebase(postData) {
        const postsRef = ref(database, 'posts');
        const newPostRef = push(postsRef);
        try {
            await set(newPostRef, postData);
            console.log("Data saved successfully");
            loadPostsFromFirebase();  // データ保存後に再読み込み
        } catch (error) {
            console.error("Error saving data: ", error);
        }
    }

    // Firebaseから投稿を読み込む関数を修正
    function loadPostsFromFirebase() {
        const postsRef = ref(database, 'posts');
        onValue(postsRef, (snapshot) => {
            const posts = snapshot.val();
            if (posts) {
                window.postsData = posts; // グローバル変数に保存
                const tableBody = document.querySelector("#postsTable tbody");
                tableBody.innerHTML = '';  // テーブルをクリア

                // 投稿を配列に変換して逆順にソート
                const postsArray = Object.entries(posts).sort((a, b) => {
                    // dateプロパティで逆順ソート
                    const dateA = new Date(a[1].date);
                    const dateB = new Date(b[1].date);
                    return dateB - dateA;
                });

                // 逆順にソートされた投稿をテーブルに追加
                postsArray.forEach(([id, post]) => {
                    addPostToTable(id, post);  // IDを渡す
                });
            }
        }, (error) => {
            console.error("Error loading data: ", error);
        });
    }    

    // getPostById関数を追加
    function getPostById(postId) {
        return window.postsData ? window.postsData[postId] : null;
    }

    // 投稿をテーブルに追加する関数を修正
    function addPostToTable(postId, post) {
        const tableBody = document.querySelector("#postsTable tbody");
        const row = document.createElement("tr");

        // 行に投稿IDをデータ属性として保存
        row.dataset.postId = postId;

        // 各セルにデータを追加
        row.appendChild(createCell(post.date));
        row.appendChild(createClickableCell('読み仮名', post.katakanaName));
        row.appendChild(createClickableCell('名前', post.kanjiName));
        row.appendChild(createCell(post.organization));
        row.appendChild(createCell(post.department));
        row.appendChild(createClickableCell('役職名', post.position));
        row.appendChild(createClickableCell('TEL', post.phone));
        row.appendChild(createClickableCell('MAIL', post.email));
        row.appendChild(createCell(post.landmark));
        row.appendChild(createCell(post.incidentType));
        row.appendChild(createCell(post.area));
        row.appendChild(createCell(post.address));

        // 緯度経度のセル
        const latLngCell = document.createElement("td");
        if (post.latLng) {
            const latLngElement = document.createElement("a");
            latLngElement.href = `https://www.google.com/maps?q=${post.latLng}`;
            latLngElement.textContent = post.latLng;
            latLngElement.target = "_blank";
            latLngCell.appendChild(latLngElement);

            // Split lat/lng and add hover event
            const [lat, lng] = post.latLng.split(", ").map(Number);
            latLngCell.addEventListener("mouseover", () => fetchAerialView(lat, lng));
            latLngCell.addEventListener("mouseout", () => {
                document.getElementById("aerialViewContainer").style.display = "none";
            });    

            // ルート検索ボタンを追加
            const routeButton = document.createElement("button");
            routeButton.textContent = "ルート検索";
            routeButton.classList.add("route-search-button");
            routeButton.onclick = () => searchRoute(routeButton);
            latLngCell.appendChild(routeButton);
        }
        row.appendChild(latLngCell);

        const photoCell = document.createElement("td");
        if (post.photo) {
            const img = document.createElement("img");
            img.src = post.photo;
            img.alt = "写真";
            img.style.maxWidth = "100px";  // 画像サイズを制限
            photoCell.appendChild(img);
        }
        row.appendChild(photoCell);

        // 詳細（メモ）のセル
        const memoCell = document.createElement("td");
        memoCell.className = "memo-cell";
        memoCell.textContent = post.memo || ''; // メモが存在しない場合は空文字列を設定
        row.appendChild(memoCell);

        // 要救助者人数のセル
        row.appendChild(createCell(post.numberOfPeople || (post.unknownPeople ? '不明・複数' : '')));

        // 削除ボタンと編集ボタンを同じセルに作成
        const actionCell = row.insertCell();

        // 削除ボタンの作成
        const deleteButton = document.createElement('button');
        deleteButton.textContent = '削除';
        deleteButton.className = 'delete-btn';
        deleteButton.addEventListener('click', () => deletePost(postId));  // IDを渡す
        actionCell.appendChild(deleteButton);

        // 編集ボタンの作成
        const editButton = document.createElement('button');
        editButton.textContent = '編集';
        editButton.className = 'edit-btn';
        editButton.addEventListener('click', () => editPost(row, postId));  // IDを渡す
        actionCell.appendChild(editButton);

        // 新しい行を表の先頭に挿入
        tableBody.insertBefore(row, tableBody.firstChild);
    }

    function createCell(text) {
        const cell = document.createElement("td");
        cell.textContent = text;
        return cell;
    }

    function createClickableCell(displayText, fullText) {
        const cell = document.createElement('td');
        const displaySpan = document.createElement('span');
        displaySpan.textContent = displayText;
        displaySpan.style.color = 'blue';
        displaySpan.style.textDecoration = 'underline';
        displaySpan.style.cursor = 'pointer';
        cell.appendChild(displaySpan);

        let detailBox = null;

        displaySpan.addEventListener('click', () => {
            if (detailBox) {
                cell.removeChild(detailBox);
                detailBox = null;
            } else {
                detailBox = document.createElement('div');
                detailBox.textContent = fullText;
                detailBox.style.backgroundColor = '#f0f0f0';
                detailBox.style.padding = '5px';
                detailBox.style.marginTop = '5px';
                cell.appendChild(detailBox);
            }
        });

        return cell;
    }

    // ページ読み込み時にFirebaseから投稿を取得
    loadPostsFromFirebase();

    // CSV抽出ボタンのイベントリスナーを追加
    document.getElementById('csvExportBtn').addEventListener('click', exportToCSV);

    // CSV抽出関数
    function exportToCSV() {
        const table = document.getElementById('postsTable');
        let csv = [];
        
        // ヘッダー行を追加
        let header = [];
        for (let cell of table.rows[0].cells) {
            header.push(cell.textContent);
        }
        csv.push(header.join(','));

        // データ行を追加
        for (let i = 1; i < table.rows.length; i++) {
            let row = [];
            for (let cell of table.rows[i].cells) {
                // クリック可能なセルの場合、フルテキストを取得
                if (cell.querySelector('span')) {
                    row.push(cell.lastChild ? cell.lastChild.textContent : cell.querySelector('span').textContent);
                } else {
                    row.push(cell.textContent);
                }
            }
            csv.push(row.join(','));
        }

        // CSVデータを作成
        const csvContent = "data:text/csv;charset=utf-8," + csv.join('\n');

        // ダウンロードリンクを作成
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "emergency_reports.csv");
        document.body.appendChild(link);

        // ダウンロードを開始
        link.click();
    }

    const LOCATIONS = [
        '相玉', '朝日町', '一丁目', '大賀茂', '河内', '敷根', '須崎', '高根', '立野', 
        '田牛', '西中', '東本郷', '蓮台寺', '外ヶ岡', '六丁目'
    ];

    const INCIDENT_TYPES = ['要救助者あり', '家屋被害', 'インフラ被害', 'その他'];

    function updateSummaryTable() {
        const postsRef = ref(database, 'posts');
        onValue(postsRef, (snapshot) => {
            const posts = [];
            snapshot.forEach((childSnapshot) => {
                posts.push(childSnapshot.val());
            });

            const summary = {};
            const total = {
                incidents: {
                    '要救助者あり': 0,
                    '家屋被害': 0,
                    'インフラ被害': 0,
                    'その他': 0
                },
                rescueNeeded: 0,
                unknownMultiple: 0
            };

            // データ集計
            posts.forEach(post => {
                const location = post.area || '不明';
                if (!summary[location]) {
                    summary[location] = {
                        incidents: {
                            '要救助者あり': 0,
                            '家屋被害': 0,
                            'インフラ被害': 0,
                            'その他': 0
                        },
                        rescueNeeded: 0,
                        unknownMultiple: 0
                    };
                }

                summary[location].incidents[post.incidentType]++;
                total.incidents[post.incidentType]++;

                if (post.incidentType === '要救助者あり') {
                    if (post.numberOfPeople === '不明・複数人') {
                        summary[location].unknownMultiple++;
                        total.unknownMultiple++;
                    } else {
                        const rescueCount = parseInt(post.numberOfPeople) || 0;
                        summary[location].rescueNeeded += rescueCount;
                        total.rescueNeeded += rescueCount;
                    }
                }
            });

            // 表の生成
            const container = document.getElementById('summaryTableContainer');
            container.innerHTML = '';

            const table = document.createElement('table');
            table.className = 'summary-table';

            // ヘッダー行の作成（発生場所）
            const headerRow = table.insertRow();
            headerRow.insertCell().textContent = ''; // 左上の空セル
            [...LOCATIONS, '合計'].forEach(location => {
                const th = document.createElement('th');
                th.textContent = location;
                headerRow.appendChild(th);
            });

            // データ行の作成
            const rowData = [
                { label: '要救助者あり', key: '要救助者あり' },
                { label: '家屋被害', key: '家屋被害' },
                { label: 'インフラ被害', key: 'インフラ被害' },
                { label: 'その他', key: 'その他' },
                { label: '要救助者人数', key: 'rescueNeeded' },
                { label: '不明・複数人', key: 'unknownMultiple' }
            ];

            rowData.forEach(({ label, key }) => {
                const row = table.insertRow();
                row.insertCell().textContent = label;
                [...LOCATIONS, '合計'].forEach(location => {
                    const cell = row.insertCell();
                    const data = location === '合計' ? total : (summary[location] || {
                        incidents: { '要救助者あり': 0, '家屋被害': 0, 'インフラ被害': 0, 'その他': 0 },
                        rescueNeeded: 0,
                        unknownMultiple: 0
                    });
                    if (key in data.incidents) {
                        cell.textContent = `${data.incidents[key]}件`;
                    } else if (key === 'rescueNeeded') {
                        cell.textContent = `${data[key]}人`;
                    } else if (key === 'unknownMultiple') {
                        cell.textContent = `${data[key]}件`;
                    }
                });
            });

            container.appendChild(table);
        }, (error) => {
            console.error("Error loading data for summary: ", error);
        });
    }

    // 初期表示時に集計表を生成
    updateSummaryTable();
});

// グローバルスコープで関数を定義
window.deletePost = function(postId) {
    const postRef = ref(database, `posts/${postId}`);
    remove(postRef).then(() => {
        console.log(`Post with ID ${postId} deleted successfully`);
        loadPostsFromFirebase();  // 更新後のデータを再読み込み
    }).catch((error) => {
        console.error("Error deleting post: ", error);
    });
}

function toggleForm() {
    var form = document.getElementById("newPostForm");
    if (form.style.display === "none" || form.style.display === "") {
        form.style.display = "block";
    } else {
        form.style.display = "none";
    }
}

function toggleSummary() {
    var content = document.getElementById("summaryContent");
    var button = document.getElementById("summaryToggle");
    if (content.style.display === "none") {
        content.style.display = "block";
        button.innerHTML = "▼ 下田市被害投稿集計表";
    } else {
        content.style.display = "none";
        button.innerHTML = "▶ 下田市被害投稿集計表";
    }
}

function toggleDamageReport() {
    var content = document.getElementById("damageReportTableContainer");
    var button = document.getElementById("damageReportToggle");
    if (content.style.display === "none") {
        content.style.display = "block";
        button.innerHTML = "▼ 被害情報投稿集約表";
    } else {
        content.style.display = "none";
        button.innerHTML = "▶ 被害情報投稿集約表";
    }
}

function scrollToElement(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}


window.editPost = function(row, postId) {
    const post = getPostById(postId);
    if (!post) return;

    // フォームに投稿データをセット
    document.getElementById("katakanaName").value = post.katakanaName || '';
    document.getElementById("kanjiName").value = post.kanjiName || '';
    document.getElementById("organization").value = post.organization || '';
    document.getElementById("department").value = post.department || '';
    document.getElementById("position").value = post.position || '';
    document.getElementById("phone").value = post.phone || '';
    document.getElementById("email").value = post.email || '';
    document.getElementById("landmark").value = post.landmark || '';
    document.getElementById("incidentType").value = post.incidentType || '';
    document.getElementById("area").value = post.area || '';
    document.getElementById("address").value = post.address || '';
    document.getElementById("mapLink").value = post.mapLink || '';
    document.getElementById("memo").value = post.memo || '';
    
    if (post.numberOfPeople === '不明・複数人') {
        document.getElementById("unknownPeople").checked = true;
        document.getElementById("peopleCount").value = '';
        document.getElementById("peopleCount").disabled = true;
    } else {
        document.getElementById("unknownPeople").checked = false;
        document.getElementById("peopleCount").value = post.numberOfPeople || '';
        document.getElementById("peopleCount").disabled = false;
    }

    // 画像データの表示と設定
    const photoInput = document.getElementById("photo");
    const photoPreview = document.getElementById("photoPreview") || document.createElement("img");
    photoPreview.id = "photoPreview";
    photoPreview.style.maxWidth = "200px";
    photoPreview.style.marginTop = "10px";
    
    if (post.photo) {
        photoPreview.src = post.photo;
        photoInput.parentNode.insertBefore(photoPreview, photoInput.nextSibling);
        
        // Base64データをBlobに変換
        fetch(post.photo)
            .then(res => res.blob())
            .then(blob => {
                // BlobからFileオブジェクトを作成
                const fileName = `image_${postId}.jpg`; // 適切なファイル名を設定
                const file = new File([blob], fileName, { type: "image/jpeg" });
                
                // FileListオブジェクトを作成
                const dataTransfer = new DataTransfer();
                dataTransfer.items.add(file);
                photoInput.files = dataTransfer.files;
                
                // 必須項目として設定
                photoInput.required = true;
            });
    } else {
        if (photoPreview.parentNode) {
            photoPreview.parentNode.removeChild(photoPreview);
        }
        photoInput.required = true;
    }

    // フォームを表示
    const formContainer = document.querySelector(".form-container");
    formContainer.style.display = "block";

    // 編集実行ボタンと戻るボタンを表示
    const form = document.getElementById("emergencyForm");
    const submitBtn = document.getElementById("submitBtn");
    const clearBtn = document.getElementById("clearBtn");
    
    submitBtn.style.display = "none";
    clearBtn.style.display = "none";
    
    let editExecuteBtn = document.getElementById("editExecuteBtn");
    let backBtn = document.getElementById("backBtn");
    
    if (!editExecuteBtn) {
        editExecuteBtn = document.createElement('button');
        editExecuteBtn.id = "editExecuteBtn";
        editExecuteBtn.textContent = "編集実行";
        editExecuteBtn.style.backgroundColor = "green";
        editExecuteBtn.style.color = "white";
        editExecuteBtn.style.padding = "10px 20px";
        editExecuteBtn.style.border = "none";
        editExecuteBtn.style.borderRadius = "5px";
        editExecuteBtn.style.cursor = "pointer";
        form.appendChild(editExecuteBtn);
    }
    
    if (!backBtn) {
        backBtn = document.createElement('button');
        backBtn.id = "backBtn";
        backBtn.textContent = "戻る";
        backBtn.style.backgroundColor = "red";
        backBtn.style.color = "white";
        backBtn.style.padding = "10px 20px";
        backBtn.style.border = "none";
        backBtn.style.borderRadius = "5px";
        backBtn.style.cursor = "pointer";
        backBtn.style.marginLeft = "10px";
        form.appendChild(backBtn);
    }

    // 戻るボタンの処理
    backBtn.onclick = function () {
        formContainer.style.display = "none";
        form.reset();
        submitBtn.style.display = "inline-block";
        clearBtn.style.display = "inline-block";
        editExecuteBtn.style.display = "none";
        backBtn.style.display = "none";
        if (photoPreview.parentNode) {
            photoPreview.parentNode.removeChild(photoPreview);
        }
    };

    // 編集実行ボタンの処理
    editExecuteBtn.onclick = async function () {
        const editedData = await getFormData();
        editedData.editDate = new Date().toLocaleString();
        editedData.original = post; // 元のデータを保存

        // 画像が変更されていない場合、元の画像データを使用
        if (!editedData.photo && post.photo) {
            editedData.photo = post.photo;
        }

        try {
            await set(ref(database, `posts/${postId}`), editedData);
            loadPostsFromFirebase();
            form.reset();
            formContainer.style.display = "none";
            submitBtn.style.display = "inline-block";
            clearBtn.style.display = "inline-block";
            editExecuteBtn.style.display = "none";
            backBtn.style.display = "none";
            if (photoPreview.parentNode) {
                photoPreview.parentNode.removeChild(photoPreview);
            }
        } catch (error) {
            console.error("Error while editing the post:", error);
        }
    };

    // 新しい画像が選択された時のプレビュー更新
    photoInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                photoPreview.src = e.target.result;
                if (!photoPreview.parentNode) {
                    photoInput.parentNode.insertBefore(photoPreview, photoInput.nextSibling);
                }
            }
            reader.readAsDataURL(file);
        } else {
            if (photoPreview.parentNode) {
                photoPreview.parentNode.removeChild(photoPreview);
            }
        }
    });
}

// getFormData関数の修正（画像が選択されていない場合の処理を追加）
async function getFormData() {
    const photoFile = document.getElementById("photo").files[0];
    let photoBase64 = null;

    if (photoFile) {
        photoBase64 = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = function (e) {
                resolve(e.target.result);
            };
            reader.readAsDataURL(photoFile);
        });
    }

    function extractLatLngFromMapLink(mapLink) {
        const regex = /@(-?\d+\.\d+),(-?\d+\.\d+)/;
        const match = mapLink.match(regex);
        return match ? `${match[1]}, ${match[2]}` : '';
    }

    const mapLink = document.getElementById("mapLink").value;
    const latLng = extractLatLngFromMapLink(mapLink);

    return {
        date: new Date().toLocaleString(),
        katakanaName: document.getElementById("katakanaName").value,
        kanjiName: document.getElementById("kanjiName").value,
        organization: document.getElementById("organization").value,
        department: document.getElementById("department").value,
        position: document.getElementById("position").value,
        phone: document.getElementById("phone").value,
        email: document.getElementById("email").value,
        landmark: document.getElementById("landmark").value,
        incidentType: document.getElementById("incidentType").value,
        area: document.getElementById("area").value,
        address: document.getElementById("address").value,
        mapLink: mapLink,
        latLng: latLng,
        photo: photoBase64,
        memo: document.getElementById("memo").value,
        numberOfPeople: unknownPeopleCheckbox.checked ? "不明・複数人" : document.getElementById("peopleCount").value
    };
}

function getPostById(postId) {
    return window.postsData ? window.postsData[postId] : null;
}

// addPostToTable関数内、投稿日時の表示部分
row.appendChild(createCell(post.date));

// 編集日時の表示
if (post.editDate) {
    const editDateCell = document.createElement("span");
    editDateCell.textContent = ` (編集: ${post.editDate})`;
    editDateCell.style.color = "blue";
    editDateCell.style.textDecoration = "underline";
    editDateCell.style.cursor = "pointer";

    editDateCell.addEventListener('click', () => {
        toggleEditHistory(row, postId);
    });

    row.lastChild.appendChild(editDateCell);
}

// 編集履歴を表示する関数
function toggleEditHistory(row, postId) {
    const post = getPostById(postId);
    if (!post) return;

    const isShowingHistory = row.classList.contains('showing-history');
    if (isShowingHistory) {
        row.querySelectorAll('.history').forEach(element => element.remove());
        row.classList.remove('showing-history');
    } else {
        for (let [key, value] of Object.entries(post)) {
            if (value !== post.original[key]) { // 編集されたフィールドのみ
                const historyCell = document.createElement('td');
                historyCell.className = 'history';
                historyCell.textContent = `元: ${post.original[key] || ''}`;
                historyCell.style.backgroundColor = '#f0f0f0';
                row.appendChild(historyCell);
            }
        }
        row.classList.add('showing-history');
    }
}

// フォームの位置を変更
const formContainer = document.querySelector(".form-container");
const summaryTableContainer = document.getElementById('summaryTableContainer');

// フォームを集計表の上に移動
summaryTableContainer.parentNode.insertBefore(formContainer, summaryTableContainer);

async function fetchAerialView(lat, lng) {
    const apiKey = "YOURKEY";
    const url = `https://maps.googleapis.com/maps/api/streetview?size=600x400&location=${lat},${lng}&fov=80&heading=70&pitch=0&key=${apiKey}`;
    
    try {
        const aerialViewContainer = document.getElementById("aerialViewImage");
        aerialViewContainer.style.backgroundImage = `url(${url})`;
        aerialViewContainer.style.backgroundSize = 'cover';
        document.getElementById("aerialViewContainer").style.display = "block";
    } catch (error) {
        console.error("Error fetching aerial view:", error);
        alert("Aerial view data could not be retrieved.");
    }
}

// Add this event listener to handle the button click
document.getElementById("fetchMapDataBtn").addEventListener("click", async function () {
    const area = document.getElementById("area").value;
    const addressContinuation = document.getElementById("address").value;
    const fullAddress = `静岡県下田市 ${area} ${addressContinuation}`;

    const result = await fetchGeocodingData(fullAddress);
    
    if (result) {
        document.getElementById("autoMapLink").value = result.mapLink;
        document.getElementById("latLng").value = result.latLng;
    } else {
        alert("住所情報の取得に失敗しました。");
    }
});

function checkStreetViewAvailability(lat, lng) {
    const streetViewService = new google.maps.StreetViewService();
    const radius = 50; // Radius in meters to search for Street View

    const location = new google.maps.LatLng(lat, lng);

    streetViewService.getPanorama({ location, radius }, (data, status) => {
        if (status === google.maps.StreetViewStatus.OK) {
            // Street View is available, fetch the image
            fetchAerialView(lat, lng);
        } else {
            // No Street View available, show an alternative message or image
            const aerialViewContainer = document.getElementById("aerialViewImage");
            aerialViewContainer.style.backgroundImage = "none";
            aerialViewContainer.textContent = "Street View imagery not available for this location.";
            document.getElementById("aerialViewContainer").style.display = "block";
        }
    });
}

function searchRoute(button) {
    // ボタンが押されたセルから緯度・経度を取得
    const cell = button.closest('td');
    const latLngElement = cell.querySelector('a');
    if (!latLngElement) {
        alert("緯度・経度が見つかりません");
        return;
    }

    const latLngText = latLngElement.textContent;
    const [lat, lng] = latLngText.split(',').map(Number);

    // 現在地を取得してルート検索
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(position => {
            const currentLat = position.coords.latitude;
            const currentLng = position.coords.longitude;

            // Google Mapsのルート検索URLを作成
            const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${currentLat},${currentLng}&destination=${lat},${lng}&travelmode=walking`;

            // 別ウィンドウでGoogle Mapsを開く
            window.open(googleMapsUrl, '_blank');
        }, () => {
            alert('現在地を取得できませんでした');
        });
    } else {
        alert('ブラウザが位置情報取得に対応していません');
    }
}
