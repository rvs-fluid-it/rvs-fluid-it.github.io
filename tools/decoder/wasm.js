'use strict';

const WASM_URL = 'decode.wasm';
const storageName = "efact-endec-data"

function buildTree(input) {
    let output = ""
    let data = {}
    try {
        data = JSON.parse(input)
    } catch (e) {
        return '<div class="alert alert-danger" role="alert">Decoding failed: ' + input + '</div>'
    }
    let currentRecord, currentIndent = 0;
    for (const key in data) {
        const recordString = getRecordString(data[key].Records)
        const recordType = data[key].RecordType
        if (parseInt(recordType) < currentRecord && parseInt(data[key].Indent) == currentIndent) {
            output += "<div class='recordSpacer'></div>"
        }
        output += "<div class='records  indent-" + data[key].Indent + "'>"
        output += "<div class='label collapseTrigger' data-ref='"+recordString+"' data-toggle=\"collapse\" data-target=\"" + recordType + "Data\">" + recordType + "</div>"
        output += "<div id='" + recordType + "Data' class='collapse recordData'>"
        output += "<div class='detail'>Source<div></div><span>"+recordString+"</span></div>"
        for (const r in data[key].Records) {
            const decoded = data[key].Records[r];
            output += "<div class='detail'>"
            output += "<div>" + decoded.Zone + "</div>"
            output += "<div>" + decoded.Value + "</div>"
            output += "<div>" + decoded.Description + "</div>"
            output += "</div>"
        }
        output += "</div>"
        output += "</div>"
        currentRecord = parseInt(recordType)
        currentIndent = parseInt(data[key].Indent)
    }
    return output
}

function getRecordString(records) {
    let str = ""
    for (let i in records) {
        str = str + records[i].Value
    }
    return str
}

function updateDecodedOutput() {
    var encodedInputValue = document.getElementById('encodedInput').innerHTML;
    document.getElementById('decodedOutput').innerHTML = buildTree(decodeMessage(encodedInputValue))
}

function updateWasmStatus() {
    var stat = document.getElementById("wasmstatus")
    stat.querySelector(".btn-danger").hidden = true
    stat.querySelector(".btn-success").hidden = false
    document.getElementById("encodedInput").disabled = false
    document.getElementById("messagesSelect").disabled = false
}
function handleTextInput(evt) {
    evt.preventDefault();
    updateEncodedInput(evt.target.value);
    enableSaveButton();
}

function handleFileSelect(evt) {
    const reader = new FileReader()
    reader.onload = handleFileLoad;
    reader.readAsText(evt.target.files[0])
}

function handleFileSave(evt) {
    evt.preventDefault();
    const fileName = document.getElementById('inputFileName').value;
    if (fileName.length === 0) {
        alert("Really? You're trying to save a file without a name? What are you thinking dude")
        return
    }
    const data = {
        name: fileName,
        data: document.getElementById('encodedInput').innerHTML
    }
    if (!validateInput(data.data)) {
        return
    }
    var existing = localStorage.getItem(storageName);
    existing = existing ? JSON.parse(existing) : [];
    existing.push(data)
    localStorage.setItem(storageName, JSON.stringify(existing));
    addSelectOption(data)
}

function validateInput(input) {
    const decoded = decodeMessage(input)
    try {
        JSON.parse(decoded)
        return true
    } catch (e) {
        return false
    }
}

function initTabActions() {
    const tabs = document.querySelectorAll('.nav-link')
    tabs.forEach(tab => {
        tab.addEventListener("click", function (ev) {
            ev.preventDefault()
            if (ev.target.classList.contains("active")) {
                return
            }
            // Remove from current
            document.querySelector('.nav-link.active').classList.remove("active");
            document.querySelector('.tabContent.active').classList.remove("active");
            document.querySelector('.tabContent[data-id=' + ev.target.dataset.id + ']').classList.add("active")
            ev.target.classList.add("active")
        })
    });
}

function initCollapsible() {
    document.addEventListener("click", function (event) {
        if ("target" in event.target.dataset) {
            var active = event.target.classList.contains('active')
            var list = document.getElementsByClassName('collapseTrigger')
            for (var i = 0; i < list.length; i++) {
                list.item(i).classList.remove('active');
            }
            var list2 = document.getElementsByClassName('collapse')
            for (var i = 0; i < list2.length; i++) {
                list2.item(i).classList.remove('show');
            }
            const InputDiv = document.getElementById("encodedInput")
            let dataStr = event.target.dataset.ref
            let innerVal = InputDiv.innerHTML
            innerVal = innerVal.replace('<span class="highlight">', '').replace('</span>', '')
            if (!active) {
                event.target.classList.add('active')
                event.target.parentElement.querySelector('.collapse').classList.add('show');
                innerVal = innerVal.replace(dataStr, '<span class="highlight">'+dataStr+'</span>')
            }
            InputDiv.innerHTML = innerVal
        }
    });
}

function setTopic() {
    document.getElementById("pubsubTopic").innerHTML = getTopic();
}

function listenForEvents() {
    const evtSource = new EventSource("/sse", {withCredentials: false});
    var stat = document.getElementById("pubsubstatus")
    evtSource.onopen = function (ev) {
        stat.querySelector(".btn-danger").hidden = true
        stat.querySelector(".btn-success").hidden = false
        document.getElementById("pubsubInactive").hidden = true
        document.getElementById("pubsubTopic").parentElement.hidden = false;
    }
    evtSource.onerror = function (ev) {
        stat.querySelector(".btn-danger").hidden = false
        stat.querySelector(".btn-success").hidden = true
        document.getElementById("pubsubTopic").parentElement.hidden = true
    };
    evtSource.onmessage = function (ev) {
        addPubSubMessage(ev.data)
    }
    document.addEventListener("click", function (event) {
        if (event.target.classList.contains("pubsubMsg")) {
            updateEncodedInput(event.target.textContent);
            enableSaveButton();
        }
    });
}

function addPubSubMessage(data) {
    var msgs = document.getElementById("pubsubMessages")
    msgs.insertAdjacentHTML('beforeend', '<div class="pubsubMsg">' + data + '</div>')
    if (msgs.childElementCount > 5) {
        msgs.removeChild(msgs.firstElementChild)
    }
}

function handleFileLoad(event) {
    document.getElementById('encodedInput').innerHTML = event.target.result;
    updateDecodedOutput();
    enableSaveButton();
}

function enableSaveButton() {
    if (!validateInput(document.getElementById('encodedInput').innerHTML)){
        return
    }
    document.getElementById('saveData').style.display = 'flex';
}

function disableSaveButton() {
    document.getElementById('saveData').style.display = 'none';
}

function addSelectOption(msgData) {
    document.getElementById('messagesSelect').insertAdjacentHTML('afterbegin', '<option value="' + msgData.data + '">' + msgData.name + '</option>')
}

function updateEncodedInput(val) {
    document.getElementById("encodedInput").innerHTML = val;
    updateDecodedOutput();
    disableSaveButton();
}

function init() {
    window.addEventListener('load', (event) => {
        initTabActions();
        listenForEvents();
        initCollapsible();
        let msgDataJson = localStorage.getItem(storageName);
        let msgData = JSON.parse(msgDataJson);
        for (const k in msgData) {
            addSelectOption(msgData[k])
        }
        document.getElementById('messagesSelect').addEventListener('change', (event) => {
            updateEncodedInput(event.target.value);
        });
        document.getElementById("encodedInput").addEventListener('change', (event) => {
            updateDecodedOutput();
        });
        document.getElementById('inputFile').addEventListener('change', handleFileSelect)
        document.getElementById('textInput').addEventListener('change', handleTextInput)
        document.getElementById('fileNameSave').addEventListener('click', handleFileSave)
        document.getElementById("viewToggle").addEventListener('click', function(ev) {
            const container = document.getElementById("viewContainer")
            if (container.classList.contains("full")) {
                container.classList.remove("full")
            } else {
                container.classList.add("full")
            }
        })
    });

}

const go = new Go();
WebAssembly.instantiateStreaming(fetch(WASM_URL), go.importObject).then(async function (obj) {
    updateWasmStatus();
    setTimeout(() => { setTopic() }, 500);
    await go.run(obj.instance);
})
init();

