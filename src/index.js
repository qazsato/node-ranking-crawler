// モジュール読み込み
var config      = require('config');                  // 定義
var asciify     = require('asciify');                 // AA
var cronJob     = require('cron').CronJob;            // cron
var client      = require('cheerio-httpcli');         // 通信
var fs          = require('fs');                      // ファイル
var async       = require('async');                   // 同期処理
var Spreadsheet = require('edit-google-spreadsheet'); // スプレッドシート

var start = function () {
  asciiFunc(function () {
    cronFunc(function () {
      fetchFunc(function (ranks) {
        spreadSheetFunc(ranks);
        csvFileFunc(ranks);
      });
    });
  });
};

var asciiFunc = function (callback) {
  asciify("RankCrawler", {font: "small"}, function(err, msg) {
    if(err) return;
    console.log(msg);
    console.log("launch time : " + new Date().toLocaleString() + "\n");
    callback();
  });
};

var cronFunc = function (callback) {
  if (config.global.cron.enable) {
    var job = new cronJob({
      cronTime: config.global.cron.time,  //実行したい日時 or crontab書式
      onTick: function() {  //指定時に実行したい関数
        callback();
      },
      onComplete: function() {  //ジョブの完了または停止時に実行する関数
      },
      start: false, // コンストラクタを終する前にジョブを開始するかどうか
      timeZone: "Asia/Tokyo"  //タイムゾーン
    });
    job.start();  //ジョブ開始
  } else {
    callback();
  }
};

var fetchFunc = function (callback) {
  var ranks = [];
  var tasks = [];

  var getTaskFunc = function (data) {
    return function (nextTask) {
      var fetches = [];

      var getFetchFunc = function (page) {
        return function (nextFetch) {
          var param = {
            q: data.word,
            start: page * 10
          };
          setTimeout(function () {
            client.fetch(config.global.url, param, function (err, $, res) {
              var $link = $("#ires .rc .r a");
              var lastIndex = $link.length - 1;
              $link.each(function (index) {
                var url = $(this).attr("href");
                if (url.indexOf(data.domain) !== -1) {
                  var rank = param.start + index + 1;
                  nextFetch(rank);
                  return false;  // 探索終了。次タスクへ以降
                } else if (index === lastIndex) {
                  nextFetch();
                }
              });
            });
          }, config.global.delayTime);
        };
      };
      for (var i = 0; i < config.global.maxPage; i++) {
        var fetch = getFetchFunc(i);
        fetches.push(fetch);
      }

      async.waterfall(fetches, function(result) {
        var rank = result ? result : "-";
        console.log(data.word + " : " + rank + "位");
        ranks.push({
          word: data.word,
          rank: rank
        });
        nextTask();
      });
    };
  };
  for (var i = 0; i < config.data.length; i++) {
    var task = getTaskFunc(config.data[i]);
    tasks.push(task);
  }

  async.waterfall(tasks, function(err) {
    if (err) throw err;
    callback(ranks);
  });
};

var spreadSheetFunc = function (ranks) {
  if (!config.global.spreadsheet.enable) return;
};

var csvFileFunc = function (ranks) {
  if (!config.global.csv.enable) return;
  var text = "";
  for (var i = 0; i < ranks.length; i++) {
    text += ranks[i].word + "," + ranks[i].rank + "\n";
  }
  fs.appendFile('result.csv',text ,'utf8', function (err) {});
};

start();  // 実行
