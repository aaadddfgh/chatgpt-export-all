//const JSZip = require("jszip");

import JSZip from "jszip";

//import JSZip from "../node_modules/jszip/lib/index";

type session = {
    user: {
        id: string;
        name: string;
        email: string;
        image: string;
        picture: string;
        mfa: boolean;
        groups: any[];
        intercom_hash: string;
    };
    expires: string;
    accessToken: string;
};

type chatList={
    items: {
        id: string;
        title: string;
        create_time: string;
        update_time: string;
    }[];
    total: number;
    limit: number;
    offset: number;
    has_missing_conversations: boolean;
}


type Msg={
    id: string;
    message: {
        id: string;
        author: {
            role: string;
            metadata?: {};
        };
        create_time?: number;
        content: {
            content_type?: string;
            parts: string[];
        };
        end_turn?: boolean;
        weight?: number;
        metadata?: {};
        recipient: string;
    };
    parent?: string;
    children: string[];
};

type Chat={
    title: string;
    create_time: number;
    update_time: number;
    mapping: any;
    moderation_results: any[];
    current_node: string;
}

type OneResult={
    title: string;
    create_time: number;
    update_time: number;
    msg:Msg[]
}
//const JSZip = require('jszip');
namespace Exporter {

    function sleep(ms:number) {
        return new Promise<void>((resolve) => {
            setTimeout(() => {
                resolve();
            }, ms);
        });
    }

    var Auth = "";
    var List:{
        id: string;
        title: string;
        create_time: string;
        update_time: string;
    }[]=[];
    export var result:OneResult[]=[];


    var i=0;
    var max=0;

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
        }).then(
            (e) => {
                let d = JSON.parse(e as string) as session;
                Auth = d.accessToken;
            }
        )
    }
    
    async function getList(off:number) {
        await new Promise(function (resolve, reject) {
            var xhr = new XMLHttpRequest();

            xhr.addEventListener("readystatechange", function () {
                if (this.readyState === 4) {
                    resolve(this.responseText);
                }
            });
            xhr.onerror = () => reject();
            off = off | 0;
            xhr.open("GET", "/backend-api/conversations?offset=".concat(off.toString(),"&limit=20"));
            xhr.setRequestHeader("authorization","Bearer ".concat(Auth))

            xhr.send();
        }).then(
            async (e) => {
                let d = JSON.parse(e as string) as chatList;
                List= List.concat(d.items);
                if(List.length>=d.total-1){
                    return;
                }
                else{
                    await sleep(1000);
                    return await new Promise<void>(
                        async (res)=>  
                        {await getList(off+20); res()}
                        );
                }
            }
        )
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
                xhr.setRequestHeader("authorization", "Bearer ".concat(Auth))

                xhr.send();
            }).then(
                async (e) => {
                    const d = JSON.parse(e as string) as Chat;
                    let root: Msg;
                    for(const j in d.mapping){
                        const item=d.mapping[j] as Msg;
                        if(item.parent===undefined){
                            root=item;
                            break;
                        }
                    }
                    let node=root;
                    let oneResult: OneResult = {
                        title: d.title,
                        create_time:d.create_time,
                        update_time:d.update_time,
                        msg: []
                    };
                    oneResult.msg.push(node);
                    while (node != undefined) {
                        
                        oneResult.msg.push(node);

                        if(node.children.length>1){
                            //将子合并
                            const chis=node.children;
                            
                            node=JSON.parse(JSON.stringify((d.mapping[node.children[chis.length-1]])));//已入下一个
                            node.message.content.parts=[];//合并入part
                            for(const id of chis){
                                node.message.content.parts.push((d.mapping[id] as Msg).message.content.parts[0])
                            }
                        }
                        else{
                            node=d.mapping[node.children[0]];//已入下一个
                        }
                        //已入下一个
                    }
                    result.push(oneResult);
                }
            )
            console.log(result.length.toString()," chat exported");
        }
    }

    export function exportAll() {
        
        let resultNum:any = window.prompt("numbers of chat you want to export, 0 means all","0");
        if(resultNum===null){
            return;
        }else if((resultNum = Number.parseInt(resultNum))>0){
            max=resultNum;
        }else{
            max=0;
        }

        new Promise(async () => {
            await getAuth();
            await getList(0);
            await getChat();
            //console.log(resultNum);
            const zip=new JSZip();
            
            for(const it of result){
                let doc="";
                it.msg.forEach((e)=>{
                    if(e.message===undefined){
                        return;
                    }
                    if(e.message.author.role==='user'){
                        doc=doc.concat("## user\n",e.message.content.parts[0],'\n')
                    }
                    else if(e.message.author.role==='assistant'){
                        let str="## chatGPT";
                        e.message.content.parts.forEach((e)=>{str=str.concat('\n###\n',e)})
                        doc=doc.concat(str,'\n')
                    }

                })
                zip.file(it.title.concat(it.create_time.toString(),".md"),doc)
            }

            zip.generateAsync({ type: "blob" }).then(function (content) {
                const link = document.createElement( 'a' );
                link.style.display = 'none';
                // see FileSaver.js
                const blob = new Blob([content]);  //myFile is Int8Array 
                const objectURL = URL.createObjectURL(blob);
                link.href = objectURL;
                link.download = "chat.zip";
                link.click();
                link.remove();
            });
        })
            .then(() => {

            }).catch(() => alert("Not Exported"))

    }
}
Exporter.exportAll()

