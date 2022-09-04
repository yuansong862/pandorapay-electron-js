console.log("Electron App")

window.PandoraPayWalletOptions = {
    intro: {
        loadWasmHelper: false,
    },
}

const waiting = {}

function sendRequestWaitAnswer(method, data ){

    return new Promise((resolve, reject)=>{
        let id = ""
        while (!id || waiting[id])
            id = Math.random().toString()

        waiting[id] = {
            resolve,
            reject,
        }

        window.api.send("toMain", {
            type: "helper-call",
            method,
            id,
            data,
        })

    })

}

window.api.receive("fromMain", (data) => {
    if (typeof data === "object" && data.type === "helper-answer") {
        const found = waiting[data.id]
        if (found) {
            delete waiting[data.id]
            if (data.error) found.reject(new Error(data.error))
            else found.resolve(data.out)
        }
    }
})

window.PandoraPayHelperPromise = new Promise((resolve) => resolve(true) )

window.PandoraPayHelperLoader = ()=>{
    window.PandoraPayHelper = {
        helloPandoraHelper: ()=> {
            console.log("HelloPandoraHelper works!")
            return true
        },
        decoderPromise: new Promise(async (resolve, reject)=>{
            try{
                const balanceDecryptorTableSize = Number.parseInt( localStorage.getItem('balanceDecryptorTableSize') || '23');
                const out = await this.sendRequestWaitAnswer("/wallet/initialize-balance-decryptor", MyTextEncode( JSONStringify( {tableSize: 1 << balanceDecryptorTableSize }) ) )
                resolve( out )
            }catch(e){
                reject(e)
            }
        }),
        wallet:{
            decryptBalance: async (data, cb )=> {
                const out = await sendRequestWaitAnswer("/wallet/decrypt-balance", data )
                return [()=>([true, out ])]
            }
        },
        transactions: {
            builder:{
                createZetherTx: async (data, cb )=> {
                    const out = await sendRequestWaitAnswer("/transactions/builder/create-zether-transaction", data )
                    out[0] = Base64Binary.decode(out[0])
                    out[1] = Base64Binary.decode(out[1])
                    return out
                }
            }
        }
    }
}


//https://github.com/danguer/blog-examples/blob/master/js/base64-binary.js
const Base64Binary = {
    _keyStr : "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",

    removePaddingChars: function(input){
        var lkey = this._keyStr.indexOf(input.charAt(input.length - 1));
        if(lkey == 64){
            return input.substring(0,input.length - 1);
        }
        return input;
    },

    decode: function (input, arrayBuffer) {
        //get last chars to see if are valid
        input = this.removePaddingChars(input);
        input = this.removePaddingChars(input);

        var bytes = parseInt((input.length / 4) * 3, 10);

        var uarray;
        var chr1, chr2, chr3;
        var enc1, enc2, enc3, enc4;
        var i = 0;
        var j = 0;

        if (arrayBuffer)
            uarray = new Uint8Array(arrayBuffer);
        else
            uarray = new Uint8Array(bytes);

        input = input.replace(/[^A-Za-z0-9\+\/\=]/g, "");

        for (i=0; i<bytes; i+=3) {
            //get the 3 octects in 4 ascii chars
            enc1 = this._keyStr.indexOf(input.charAt(j++));
            enc2 = this._keyStr.indexOf(input.charAt(j++));
            enc3 = this._keyStr.indexOf(input.charAt(j++));
            enc4 = this._keyStr.indexOf(input.charAt(j++));

            chr1 = (enc1 << 2) | (enc2 >> 4);
            chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
            chr3 = ((enc3 & 3) << 6) | enc4;

            uarray[i] = chr1;
            if (enc3 != 64) uarray[i+1] = chr2;
            if (enc4 != 64) uarray[i+2] = chr3;
        }

        return uarray;
    }
}