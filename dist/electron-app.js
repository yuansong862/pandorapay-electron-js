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
                createZetherTx: (data, cb )=> sendRequestWaitAnswer("/transactions/builder/create-zether-transaction", data )
            }
        }
    }
}