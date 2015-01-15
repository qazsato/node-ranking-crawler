// モジュール読み込み
var config = require('config');				// 定義
var client = require('cheerio-httpcli');	// 通信
var fs = require('fs');						// ファイル
var async = require('async');				// 同期処理


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
				client.fetch(config.url, param, function (err, $, res) {
					var $link = $("#ires .rc .r a");
					var lastIndex = $link.length - 1;
					$link.each(function (index) {
						var url = $(this).attr("href");
						if (url.indexOf(data.domain) !== -1) {
							var rank = param.start + index + 1;
							nextFetch(param.q + " ==> " + rank + "位");
							return false;	// 探索終了。次タスクへ以降
						} else if (index === lastIndex) {
							nextFetch();
						}
					});
				});
			};
		};

		for (var i = 0; i < config.maxPage; i++) {
			var fetch = getFetchFunc(i);
			fetches.push(fetch);
		}

		async.waterfall(fetches, function(msg) {
			var str = msg ? msg: data.word + " ==> 該当なし";
			console.log(str);
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
	console.log('All Task Done.');
});