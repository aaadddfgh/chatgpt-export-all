//const JSZip = require("jszip");
import JSZip from "jszip";
//const JSZip = require('jszip');
var Exporter;
(function (Exporter) {
    function sleep(ms) {
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve();
            }, ms);
        });
    }
    var Auth = "";
    var List = [];
    Exporter.result = [];
    var i = 0;
    var max = 0;
    async function getAuth() {
        await new Promise(function (resolve, reject) {
            var xhr = new XMLHttpRequest();
            xhr.withCredentials = true;
            xhr.addEventListener("readystatechange", function () {
                if (this.readyState === 4) {
                    resolve(this.responseText);
                }
            });
            xhr.onerror = () => reject();
            xhr.open("GET", "/api/auth/session");
            xhr.send();
        }).then((e) => {
            let d = JSON.parse(e);
            Auth = d.accessToken;
        });
    }
    async function getList(off) {
        await new Promise(function (resolve, reject) {
            var xhr = new XMLHttpRequest();
            xhr.addEventListener("readystatechange", function () {
                if (this.readyState === 4) {
                    resolve(this.responseText);
                }
            });
            xhr.onerror = () => reject();
            off = off | 0;
            xhr.open("GET", "/backend-api/conversations?offset=".concat(off.toString(), "&limit=20"));
            xhr.setRequestHeader("authorization", "Bearer ".concat(Auth));
            xhr.send();
        }).then(async (e) => {
            let d = JSON.parse(e);
            List = List.concat(d.items);
            if (List.length >= d.total - 1) {
                return;
            }
            else {
                await sleep(1000);
                return await new Promise(async (res) => { await getList(off + 20); res(); });
            }
        });
    }
    async function getChat() {
        for (const it of List) {
            //too fast will blocked
            await sleep(500);
            await new Promise(function (resolve, reject) {
                var xhr = new XMLHttpRequest();
                xhr.addEventListener("readystatechange", function () {
                    if (this.readyState === 4) {
                        resolve(this.responseText);
                    }
                });
                xhr.onerror = () => reject();
                xhr.open("GET", "/backend-api/conversation/".concat(it.id));
                xhr.setRequestHeader("authorization", "Bearer ".concat(Auth));
                xhr.send();
            }).then(async (e) => {
                const d = JSON.parse(e);
                let root;
                for (const j in d.mapping) {
                    const item = d.mapping[j];
                    if (item.parent === undefined) {
                        root = item;
                        break;
                    }
                }
                let node = root;
                let oneResult = {
                    title: d.title,
                    create_time: d.create_time,
                    update_time: d.update_time,
                    msg: []
                };
                oneResult.msg.push(node);
                while (node != undefined) {
                    oneResult.msg.push(node);
                    if (node.children.length > 1) {
                        //将子合并
                        const chis = node.children;
                        node = JSON.parse(JSON.stringify((d.mapping[node.children[chis.length - 1]]))); //已入下一个
                        node.message.content.parts = []; //合并入part
                        for (const id of chis) {
                            node.message.content.parts.push(d.mapping[id].message.content.parts[0]);
                        }
                    }
                    else {
                        node = d.mapping[node.children[0]]; //已入下一个
                    }
                    //已入下一个
                }
                Exporter.result.push(oneResult);
            });
            console.log(Exporter.result.length.toString(), " chat exported");
        }
    }
    function exportAll() {
        let resultNum = window.prompt("numbers of chat you want to export, 0 means all", "0");
        if (resultNum === null) {
            return;
        }
        else if ((resultNum = Number.parseInt(resultNum)) > 0) {
            max = resultNum;
        }
        else {
            max = 0;
        }
        new Promise(async () => {
            await getAuth();
            await getList(0);
            await getChat();
            //console.log(resultNum);
            const zip = new JSZip();
            for (const it of Exporter.result) {
                let doc = "";
                it.msg.forEach((e) => {
                    if (e.message === undefined) {
                        return;
                    }
                    if (e.message.author.role === 'user') {
                        doc = doc.concat("## user\n", e.message.content.parts[0], '\n');
                    }
                    else if (e.message.author.role === 'assistant') {
                        let str = "## chatGPT";
                        e.message.content.parts.forEach((e) => { str = str.concat('\n###\n', e); });
                        doc = doc.concat(str, '\n');
                    }
                });
                zip.file(it.title.concat(it.create_time.toString(), ".md"), doc);
            }
            zip.generateAsync({ type: "blob" }).then(function (content) {
                const link = document.createElement('a');
                link.style.display = 'none';
                // see FileSaver.js
                const blob = new Blob([content]); //myFile is Int8Array 
                const objectURL = URL.createObjectURL(blob);
                link.href = objectURL;
                link.download = "chat.zip";
                link.click();
                link.remove();
            });
        })
            .then(() => {
        }).catch(() => alert("Not Exported"));
    }
    Exporter.exportAll = exportAll;
})(Exporter || (Exporter = {}));
Exporter.exportAll();
