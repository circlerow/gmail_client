
const CLIENT_ID = '600421017738-adlfl0kf2dcel6h4ot0uncfal31kuc54.apps.googleusercontent.com';//Thay thế bằng clientId của bạn
const API_KEY = 'AIzaSyBWyDXn05ZoDqy698_vxCVcHjEeWsiZZec';//Thay thế bằng apiKey của bạn

const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/gmail/v1/rest';

const SCOPES = 'https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/gmail.compose';

let tokenClient;
let gapiInited = false;
let gisInited = false;
let count = 1;

document.getElementById('authorize_button').style.visibility = 'hidden';
document.getElementById('signout_button').style.visibility = 'hidden';
document.getElementById('list_email').style.visibility = 'hidden';
document.getElementById('send_button').style.visibility = 'hidden';
document.getElementById('send_button_attach').style.visibility = 'hidden';
document.getElementById('file-input').style.visibility = 'hidden';
document.getElementById('send_email_1').style.visibility = 'hidden';
document.getElementById('send_email_2').style.visibility = 'hidden';
document.getElementById('send_email_3').style.visibility = 'hidden';
document.getElementById('send_email_4').style.visibility = 'hidden';
document.getElementById('send_email_a4').style.visibility = 'hidden';

function gapiLoaded() {
    gapi.load('client', initializeGapiClient);
}

async function initializeGapiClient() {
    await gapi.client.init({
        apiKey: API_KEY,
        discoveryDocs: [DISCOVERY_DOC],
    });
    gapiInited = true;
    maybeEnableButtons();
}

function gisLoaded() {
    tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: '',
    });
    gisInited = true;
    maybeEnableButtons();
}

function maybeEnableButtons() {
    if (gapiInited && gisInited) {
        document.getElementById('authorize_button').style.visibility = 'visible';
    }
}

function handleAuthClick() {
    tokenClient.callback = async (resp) => {
        if (resp.error !== undefined) {
            throw (resp);
        }
        document.getElementById('signout_button').style.visibility = 'visible';
        document.getElementById('send_button').style.visibility = 'visible';
        document.getElementById('list_email').style.visibility = 'visible';
        document.getElementById('send_button_attach').style.visibility = 'visible';
        document.getElementById('authorize_button').innerText = 'Refresh';
    };

    if (gapi.client.getToken() === null) {

        tokenClient.requestAccessToken({ prompt: 'consent' });
    } else {
        tokenClient.requestAccessToken({ prompt: '' });
    }
}


function handleSignoutClick() {
    const token = gapi.client.getToken();
    if (token !== null) {
        google.accounts.oauth2.revoke(token.access_token);
        gapi.client.setToken('');
        document.getElementById('content').innerText = '';
        document.getElementById('authorize_button').innerText = 'Authorize';
        document.getElementById('signout_button').style.visibility = 'hidden';
        document.getElementById('list_email').style.visibility = 'hidden';
        document.getElementById('send_button').style.visibility = 'hidden';
        document.getElementById('send_button_attach').style.visibility = 'hidden';
    }
}

async function listEmails() {
    let response;
    try {
        response = await gapi.client.gmail.users.messages.list({
            'userId': 'me',
        });
    } catch (err) {
        document.getElementById('content').innerText = err.message;
        return;
    }
    const emails = response.result.messages;
    if (!emails || emails.length == 0) {
        document.getElementById('content').innerText = 'Không tìm thấy email nào.';
        return;
    }

    let content = document.createElement('table');
    document.getElementById('content').appendChild(content);
    const detailEmail = document.getElementById('detailEmail');
    if (detailEmail != null) document.body.removeChild(detailEmail);
    const tr = document.createElement('tr');
    const td0 = document.createElement('td');
    const td1 = document.createElement('td');
    const td2 = document.createElement('td');
    const td3 = document.createElement('td');
    td0.innerText = 'STT';
    tr.appendChild(td0);
    td1.innerText = `Tiêu đề(Nhấn vào từng phần tiêu đề để xem chi tiết)`;
    tr.appendChild(td1);
    td2.innerText = `Người gửi`;
    tr.appendChild(td2);
    td3.innerText = `Ngày gửi`;
    tr.appendChild(td3);
    content.appendChild(tr);

    const emailPromises = emails.map(async (email) => {
        try {
            const emailResponse = await gapi.client.gmail.users.messages.get({
                'userId': 'me',
                'id': email.id,
                'format': 'metadata', // Định dạng metadata để chỉ lấy tiêu đề và người gửi
            });
            const emailData = emailResponse.result;
            const subject = emailData.payload.headers.find(header => header.name === 'Subject');
            const sender = emailData.payload.headers.find(header => header.name === 'From');
            const date = emailData.payload.headers.find(header => header.name === 'Date');
            const tr = document.createElement('tr');
            const td0 = document.createElement('td');
            const td1 = document.createElement('td');
            const td2 = document.createElement('td');
            const td3 = document.createElement('td');
            td1.className = 'detailEmail';
            td1.addEventListener('click', () => {
                viewEmailDetails(email.id);
                document.getElementById('content').removeChild(content);
                document.getElementById('content').removeChild(buttonNext);
                count = 1;
            })
            td0.innerText = count;
            tr.appendChild(td0);
            td1.innerText = `${subject.value}`;
            tr.appendChild(td1);
            td2.innerText = `${sender.value}`;
            tr.appendChild(td2);
            td3.innerText = `${date.value}`;
            tr.appendChild(td3);
            content.appendChild(tr);
            count++;
        } catch (err) {
            console.error(`Lỗi khi lấy thông tin email ${email.id}: ${err.message}`);
        }
    });

    const buttonNext = document.createElement('button');
    buttonNext.innerText = 'NextPage';
    buttonNext.id = 'buttonNext';
    buttonNext.addEventListener('click', () => {
        document.getElementById('content').removeChild(content);
        document.getElementById('content').removeChild(buttonNext);
        listEmails();
    })
    document.getElementById('content').appendChild(buttonNext);

    await Promise.all(emailPromises);
}

/** 
 @param {string} to 
 @param {string} subject
 @param {string} body 
*/

async function sendEmail(to, subject, body) {
    const emailHeaders = [
        `To: ${to}`,
        'Content-Type: text/plain; charset="UTF-8"',
        'MIME-Version: 1.0',
        `Subject: ${subject}`,
        '',
        body
    ];
    const email = emailHeaders.join('\r\n').trim();

    try {
        const response = await gapi.client.gmail.users.messages.send({
            'userId': 'me',
            'resource': {
                'raw': window.btoa(unescape(encodeURIComponent(email)))
            }
        });
        console.log('Email sent:', response);
    } catch (err) {
        console.error('Lỗi khi gửi email:', err);
    }
}
async function sendEmailWithAttachment(to, subject, body, attachment) {
    const reader = new FileReader();

    reader.onload = async function (event) {
        const attachmentData = event.target.result.split(',')[1]; // Lấy dữ liệu từ base64

        const emailHeaders = [
            `To: ${to}`,
            'Content-Type: multipart/mixed; boundary="boundary"',
            'MIME-Version: 1.0',
            `Subject: ${subject}`,
            '',
            '--boundary',
            'Content-Type: text/plain; charset="UTF-8"',
            '',
            body,
            '',
            '--boundary',
            `Content-Type: ${attachment.type}`,
            'Content-Transfer-Encoding: base64',
            '',
            attachmentData,
            '--boundary--',
        ];

        const email = emailHeaders.join('\r\n').trim();

        try {
            const response = await gapi.client.gmail.users.messages.send({
                'userId': 'me',
                'resource': {
                    'raw': window.btoa(unescape(encodeURIComponent(email)))
                }
            });
            console.log('Email sent:', response);
        } catch (err) {
            console.error('Lỗi khi gửi email:', err);
        }
    };

    reader.readAsDataURL(attachment);
}

document.getElementById('list_email').addEventListener('click', listEmails);

document.getElementById('send_button').addEventListener('click', function () {
    document.getElementById("send_email_1").style.visibility = "visible";
    document.getElementById("send_email_2").style.visibility = "visible";
    document.getElementById("send_email_3").style.visibility = "visible";
    document.getElementById("send_email_4").style.visibility = "visible";
    document.getElementById('send_email_a4').style.visibility = 'hidden';
    document.getElementById("file-input").style.visibility = "hidden";
});

document.getElementById('send_email_4').addEventListener('click', function () {
    const to = document.getElementById('send_email_1').value;
    const subject = document.getElementById('send_email_2').value;
    const body = document.getElementById('send_email_3').value;
    sendEmail(to, subject, body);
    alert("Đã gửi thành công");
    document.getElementById('send_email_1').value = '';
    document.getElementById('send_email_2').value = '';
    document.getElementById('send_email_3').value = '';
});

document.getElementById("send_button_attach").addEventListener('click', function () {
    document.getElementById("send_email_1").style.visibility = "visible";
    document.getElementById("send_email_2").style.visibility = "visible";
    document.getElementById("send_email_3").style.visibility = "visible";
    document.getElementById("file-input").style.visibility = "visible";
    document.getElementById("send_email_a4").style.visibility = "visible";
    document.getElementById('send_email_4').style.visibility = 'hidden';
});

document.getElementById('send_email_a4').addEventListener('click', function () {
    const to = document.getElementById('send_email_1').value;
    const subject = document.getElementById('send_email_2').value;
    const body = document.getElementById('send_email_3').value;
    const attachment = document.getElementById('file-input').files[0]; // Tệp đính kèm
    sendEmailWithAttachment(to, subject, body, attachment);
    alert("Đã gửi thành công");
    document.getElementById('send_email_1').value = '';
    document.getElementById('send_email_2').value = '';
    document.getElementById('send_email_3').value = '';
    document.getElementById('file-input').value = '';
});

async function viewEmailDetails(emailId) {
    try {
        const response = await gapi.client.gmail.users.messages.get({
            'userId': 'me',
            'id': emailId,
            'format': 'full',
        });

        const emailData = response.result;
        const subject = emailData.payload.headers.find(header => header.name === 'Subject');
        const sender = emailData.payload.headers.find(header => header.name === 'From');
        const date = emailData.payload.headers.find(header => header.name === 'Date');
        const body = emailData.snippet;
        const emailInfo = `<h2>Chi tiết email</h2>Tiêu đề: ${subject.value}<br>Người gửi: ${sender.value}<br>Ngày gửi: ${date.value}<br>Nội dung: ${body}<br><br>;`
        const detailEmail = document.createElement('div');
        detailEmail.id = 'detailEmail';
        detailEmail.classList = "text-left p-3 bg-light";
        detailEmail.innerHTML = emailInfo;
        document.body.appendChild(detailEmail);
    } catch (err) {
        console.error(`Lỗi khi lấy chi tiết email ${emailId}: ${err.message}`);
    }
}
