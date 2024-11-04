let defaultPageData = {url: "", ua: ""};
let crawlTabId = 0;
let currentUa = "";
let pageQueue = [];
let addQueueTimers = [];
let resetTimers = [];
let tabTimeoutTimerId = 0;
let isResetTab = false;

function resetCrawlData() {
  crawlTabId = 0;
  currentUa = "";
  pageQueue = [];
  addQueueTimers.forEach((timerInfo) => clearTimeout(timerInfo.timerId));
  addQueueTimers = [];
  if (tabTimeoutTimerId != 0) {
    clearTimeout(tabTimeoutTimerId);
  }
  resetTimers.forEach((timerId) => clearTimeout(timerId));
  resetTimers = [];
  tabTimeoutTimerId = 0;
}

function setPageQueueTop() {
  if (crawlTabId != 0) {
    const prevTabId = crawlTabId;
    crawlTabId = 0;
    browser.tabs.remove(prevTabId);
  }

  browser.tabs.create({}).then((tab) => {
    crawlTabId = tab.id;

    if (pageQueue.length == 0) {
      currentUa = defaultPageData.ua;
      browser.tabs.update(crawlTabId, {url: defaultPageData.url});
    } else {
      const pageInfo = pageQueue.shift();
      currentUa = pageInfo.ua;
      browser.tabs.update(crawlTabId, {url: pageInfo.url});
      tabTimeoutTimerId = setTimeout(() => {
        setPageQueueTop();
      }, pageInfo.timeout * 1000);
    }
  });
}

function setAddQueTimer(pageInfo) {
  // 次の単位時間にタイマーを設定
  const date = new Date();
  date.setSeconds(0);
  date.setMinutes(0);
  date.setHours(Math.floor((date.getHours() + pageInfo.interval - pageInfo.offset) / pageInfo.interval) * pageInfo.interval + pageInfo.offset);
  
  const timerId = setTimeout(() => {
    pageQueue.push(pageInfo);
    if (pageQueue.length == 1) {
      setPageQueueTop();
    }
    addQueueTimers = addQueueTimers.filter(timerInfo => timerInfo.pageInfo.id != pageInfo.id);
    setAddQueTimer(pageInfo);
  }, date - new Date());
  addQueueTimers.push({timerId: timerId, pageInfo: pageInfo});
}

function resetTab() {
  isResetTab = true;
  browser.tabs.remove(crawlTabId);
}

function setResetTimer(resetInfo) {
  // 次の時刻にリセットタイマーを設定
  const hh = parseInt(resetInfo.hh, 10);
  const mm = parseInt(resetInfo.mm, 10);

  let date = new Date();
  date.setSeconds(0);
  date.setMinutes(mm);
  date.setHours(hh);

  if (date <= new Date()) {
    // 現時刻より前になる場合は24時間後
    date.setHours(date.getHours() + 24);
  }

  const timerId = setTimeout(() => {
    resetTab();
  }, date - new Date());
  resetTimers.push(timerId);
}

function openPage() {
  // ストレージからデータ読み込み
  browser.storage.local.get().then((result) => {
    // 設定前に一度リセット
    resetCrawlData();

    // デフォルトページ表示
    defaultPageData.url = result.defaultUrl || "";
    defaultPageData.ua = result.defaultUa || "";
    setPageQueueTop();

    // 各種タイマー設定
    const pageInfo = result.pageInfo ? JSON.parse(result.pageInfo) : [];
    for (let i in pageInfo) {
      setAddQueTimer(Object.assign({id: i}, pageInfo[i]));
    }

    const resetInfo = result.resetInfo ? JSON.parse(result.resetInfo) : [];
    for (let i in resetInfo) {
      setResetTimer(resetInfo[i]);
    }
  });
}

function handleRemoved(tabId, removeInfo) {
  if (tabId == crawlTabId) {
    resetCrawlData();
    if (isResetTab) {
      // タブリセットにより閉じられた場合は再度開く
      isResetTab = false;
      openPage();
    }
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
