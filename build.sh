set -e

npx macro-ts build
rm -rf dist
mv .macro-ts/dist/anywhere-latest/ dist
