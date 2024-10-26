let defaultPageData = {url: "", ua: ""};
let crawlTabId = 0;
let currentUa = "";
let pageQueue = [];
let addQueueTimers = [];
let tabTimeoutTimerId = 0;
let isDefaultPage = false;

function resetCrawlData() {
  crawlTabId = 0;
  currentUa = "";
  pageQueue = [];
  addQueueTimers.forEach((timerInfo) => clearTimeout(timerInfo.timerId));
  addQueueTimers = [];
  if (tabTimeoutTimerId != 0) {
    clearTimeout(tabTimeoutTimerId);
  }
  tabTimeoutTimerId = 0;
}

function setPageQueueTop() {
  if (pageQueue.length == 0) {
    browser.tabs.update(crawlTabId, {url: defaultPageData.url});
    currentUa = defaultPageData.ua;
    isDefaultPage = true;
  } else {
    const pageInfo = pageQueue.shift();
    browser.tabs.update(crawlTabId, {url: pageInfo.url});
    currentUa = pageInfo.ua;
    isDefaultPage = false;
    tabTimeoutTimerId = setTimeout(() => {
      setPageQueueTop();
    }, pageInfo.timeout * 1000);
  }
}

function setAddQueTimer(pageInfo) {
  // 次の単位時間にタイマーを設定
  const date = new Date();
  date.setSeconds(0);
  date.setMinutes(0);
  date.setHours(Math.floor((date.getHours() + pageInfo.interval - pageInfo.offset) / pageInfo.interval) * pageInfo.interval + pageInfo.offset);
  
  const timerId = setTimeout(() => {
    pageQueue.push(pageInfo);
    if (isDefaultPage) {
      setPageQueueTop();
    }
    addQueueTimers = addQueueTimers.filter(timerInfo => timerInfo.pageInfo.id != pageInfo.id);
    setAddQueTimer(pageInfo);
  }, date - new Date());
  addQueueTimers.push({timerId: timerId, pageInfo: pageInfo});
}

function openPage() {
  // ストレージからデータ読み込み
  browser.storage.local.get().then((result) => {
    // 設定前に一度リセット
    resetCrawlData();
    defaultPageData.url = result.defaultUrl || "";
    defaultPageData.ua = result.defaultUa || "";

    browser.tabs.create({url: defaultPageData.url}).then((tab) => {
      isDefaultPage = true;
      crawlTabId = tab.id;

      const pageInfo = result.pageInfo ? JSON.parse(result.pageInfo) : [];
      for (let i in pageInfo) {
        setAddQueTimer(Object.assign({id: i}, pageInfo[i]));
      }  
    });
  });
}

function handleRemoved(tabId, removeInfo) {
  if (tabId == crawlTabId) {
    resetCrawlData();
  }
}

function onSendHeader(details) {
  if (details.tabId == crawlTabId && currentUa != "") {
    for (const header of details.requestHeaders) {
      if (header.name.toLowerCase() === "user-agent") {
        header.value = currentUa;
      }
    }
  }
  return {requestHeaders: details.requestHeaders};
}

browser.browserAction.onClicked.addListener(openPage);
browser.tabs.onRemoved.addListener(handleRemoved);
browser.webRequest.onBeforeSendHeaders.addListener(
  onSendHeader,
  {urls: ["<all_urls>"]},
  ["blocking", "requestHeaders"]
);
