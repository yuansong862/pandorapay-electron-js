if [ $# -eq 0 ]; then
  echo "arguments missing"
fi

if [[ "$*" == "help" ]]; then
    echo "wallet, wasm, electron-helper"
    exit 1
fi

echo "Running build"

if [[ "$*" == *wasm* ]]; then
  echo "Build Wasm"

  cd ../go-pandora-pay/ || exit
  ./scripts/build-wasm.sh main build
  ./scripts/build-wasm.sh helper build

  cd ../pandorapay-electron-js || exit
fi

if [[ "$*" == *electron-helper* ]]; then
  echo "Build Electron Helper"

  cd ../go-pandora-pay/ || exit
  ./scripts/build-electron-helper.sh

  mkdir ../pandorapay-electron-js/dist/helper
  cp ./builds/electron_helper/bin/* ../pandorapay-electron-js/dist/helper

  cd ../pandorapay-electron-js || exit
fi

if [[ "$*" == *wallet* ]]; then
  echo "Build Wallet"

  cd ../PandoraPay-wallet/ || exit

  npm run build

  cp -r ./dist/build/* ../pandorapay-electron-js/dist

  cd ../pandorapay-electron-js/ || exit
  rm ./dist/wasm/PandoraPay-wallet-helper.wasm
  rm ./dist/wasm/PandoraPay-wallet-helper.wasm.gz
  rm ./dist/wasm/PandoraPay-wallet-helper.wasm.br
  rm ./dist/wasm/PandoraPay-wallet-main.wasm.gz
  rm ./dist/wasm/PandoraPay-wallet-main.wasm.br
fi