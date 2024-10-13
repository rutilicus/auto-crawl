const fileVersion = 1;

function deleteItem(id) {
  if (document.getElementsByClassName("item").length > 1) {
    document.getElementById(id).remove();
  }
}

function createItemRow(url, ua, interval, offset, timeout, id) {
  const itemRowElem = document.createElement("div");
  itemRowElem.className = "item";
  itemRowElem.id = id;

  const urlDivElem = document.createElement("div");
  urlDivElem.className = "labelInput";
  itemRowElem.appendChild(urlDivElem);
  const urlLabelElem = document.createElement("label");
  urlLabelElem.for = "url";
  urlLabelElem.textContent = "URL:";
  urlDivElem.appendChild(urlLabelElem);
  const urlInputElem = document.createElement("input");
  urlInputElem.type = "url";
  urlInputElem.name = "url";
  urlInputElem.value = url;
  urlDivElem.appendChild(urlInputElem);

  const uaDivElem = document.createElement("div");
  uaDivElem.className = "labelInput";
  itemRowElem.appendChild(uaDivElem);
  const uaLabelElem = document.createElement("label");
  uaLabelElem.for = "ua";
  uaLabelElem.textContent = "UA:";
  uaDivElem.appendChild(uaLabelElem);
  const uaInputElem = document.createElement("input");
  uaInputElem.type = "text";
  uaInputElem.name = "ua";
  uaInputElem.value = ua;
  uaDivElem.appendChild(uaInputElem);

  const intervalDivElem = document.createElement("div");
  intervalDivElem.className = "labelInput";
  itemRowElem.appendChild(intervalDivElem);
  const intervalLabelElem = document.createElement("label");
  intervalLabelElem.for = "interval";
  intervalLabelElem.textContent = "Interval(1, 2, 4, 6, 12, 24 hours):";
  intervalDivElem.appendChild(intervalLabelElem);
  const intervalInputElem = document.createElement("input");
  intervalInputElem.type = "text";
  intervalInputElem.name = "interval";
  intervalInputElem.value = interval;
  intervalDivElem.appendChild(intervalInputElem);

  const offsetDivElem = document.createElement("div");
  offsetDivElem.className = "labelInput";
  itemRowElem.appendChild(offsetDivElem);
  const offsetLabelElem = document.createElement("label");
  offsetLabelElem.for = "offset";
  offsetLabelElem.textContent = "Offset(hours):";
  offsetDivElem.appendChild(offsetLabelElem);
  const offsetInputElem = document.createElement("input");
  offsetInputElem.type = "text";
  offsetInputElem.name = "offset";
  offsetInputElem.value = offset;
  offsetDivElem.appendChild(offsetInputElem);

  const timeoutDivElem = document.createElement("div");
  timeoutDivElem.className = "labelInput";
  itemRowElem.appendChild(timeoutDivElem);
  const timeoutLabelElem = document.createElement("label");
  timeoutLabelElem.for = "timeout";
  timeoutLabelElem.textContent = "Timeout(seconds):";
  timeoutDivElem.appendChild(timeoutLabelElem);
  const timeoutInputElem = document.createElement("input");
  timeoutInputElem.type = "text";
  timeoutInputElem.name = "timeout";
  timeoutInputElem.value = timeout;
  timeoutDivElem.appendChild(timeoutInputElem);

  const btnRowElem = document.createElement("div");
  btnRowElem.className = "btnRow";
  itemRowElem.appendChild(btnRowElem);
  const deleteBtn = document.createElement("button");
  deleteBtn.type = "button";
  deleteBtn.textContent = "Delete"
  deleteBtn.addEventListener("click", () => deleteItem(id));
  btnRowElem.appendChild(deleteBtn);

  return itemRowElem;
}

function addItemRow(pageInfo) {
  let maxId = 0;
  const itemRows = document.getElementsByClassName("item");
  for (let i = 0; i < itemRows.length; i++) {
    maxId = Math.max(maxId, parseInt(itemRows[i].id, 10));
  }

  document.getElementById("itemArray").appendChild(
    createItemRow(pageInfo.url, pageInfo.ua, pageInfo.interval, pageInfo.offset, pageInfo.timeout, maxId + 1)
  );
}

function addNewItemRow() {
  addItemRow(
    {url: "", ua: "", interval: 1, offset: 0, timeout: 1}
  );
}

function setPageContent() {
  // 最初に全部取り除く
  const itemArray = document.getElementById("itemArray");
  while (itemArray.firstChild) {
    itemArray.removeChild(itemArray.firstChild);
  }
  document.getElementById("defaultUrl").value = "";
  document.getElementById("defaultUa").value = "";

  browser.storage.local.get().then((result) => {
    if (result.defaultUrl) {
      document.getElementById("defaultUrl").value = result.defaultUrl;
    }
    if (result.defaultUa) {
      document.getElementById("defaultUa").value = result.defaultUa;
    }
    const pageInfoArray = result.pageInfo ? JSON.parse(result.pageInfo) : [];
    for (let i in pageInfoArray) {
      addItemRow(pageInfoArray[i]);
    }
  });
}

function savePageData() {
  const newData = new Object();

  // ファイルバージョン設定
  newData.version = fileVersion;

  newData.defaultUrl = document.getElementById("defaultUrl").value;
  newData.defaultUa = document.getElementById("defaultUa").value;
  const pageInfo = [];
  const itemElems = document.querySelectorAll(".item");
  for (let i = 0; i < itemElems.length; i++) {
    const itemData = new Object();
    itemData.url = itemElems[i].querySelector("input[name=url]").value;
    itemData.ua = itemElems[i].querySelector("input[name=ua]").value;
    const parsedInterval = parseInt(itemElems[i].querySelector("input[name=interval]").value, 10) || 1;
    itemData.interval = 24 % parsedInterval == 0 ? parsedInterval : 1;
    itemData.offset = parseInt(itemElems[i].querySelector("input[name=offset]").value, 10) || 0;
    itemData.timeout = parseInt(itemElems[i].querySelector("input[name=timeout]").value, 10) || 1;

    pageInfo.push(itemData);
  }
  newData.pageInfo = JSON.stringify(pageInfo);

  browser.storage.local.set(newData);
}

function exportJson() {
  browser.storage.local.get().then((result) => {
    const current = new Date();
    const a = document.createElement('a');
    const exportData = new Object();
    exportData.version = result.version ? result.version : fileVersion;
    exportData.defaultUrl = result.defaultUrl ? result.defaultUrl : "";
    exportData.defaultUa = result.defaultUa ? result.defaultUa : "";
    exportData.pageInfo = result.pageInfo ? JSON.parse(result.pageInfo) : [];
    a.href = URL.createObjectURL(new Blob([JSON.stringify(exportData)],
                                          { type: "application/json"}));
    a.download = current.getFullYear().toString() + current.getMonth() + current.getDate()
                 + current.getHours() + current.getMinutes() + current.getSeconds()
                 + "auto-crawl.json"
    a.click();
  });
}

function importJson() {
  document.getElementById("importFile").click();
}

async function importFileLoad(event) {
  const [file] = event.target.files;

  if (file) {
    const readData = JSON.parse(await file.text());
    const saveData = new Object();
    saveData.version = readData.version ? readData.version : fileVersion;
    saveData.defaultUrl = readData.defaultUrl ? readData.defaultUrl : "";
    saveData.defaultUa = readData.defaultUa ? readData.defaultUa : "";
    saveData.pageInfo = readData.pageInfo ? JSON.stringify(readData.pageInfo) : "[]";
    browser.storage.local.set(saveData);

    // 読み込んだらページ再設定
    setPageContent();
  }
}

document.getElementById("saveBtn").addEventListener("click", savePageData);
document.getElementById("addBtn").addEventListener("click", addNewItemRow);
document.getElementById("exportBtn").addEventListener("click", exportJson);
document.getElementById("importBtn").addEventListener("click", importJson);
document.getElementById("importFile").addEventListener("change", importFileLoad);

setPageContent();
