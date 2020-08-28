set -e

npx macro-ts build
rm -rf dist
mv .macro-ts/dist/node-latest/ dist
