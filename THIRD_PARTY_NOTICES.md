# Third-party notices

## shadcn/ui component source

The dashboard includes source components based on shadcn/ui, licensed under the MIT License.

Copyright (c) 2023 shadcn

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

Upstream: https://github.com/shadcn-ui/ui

## Runtime and build dependencies

The dashboard imports Radix UI primitives as npm dependencies. The upstream Radix primitives project is MIT licensed: https://github.com/radix-ui/primitives/blob/main/LICENSE

The RansomWatch dashboard build configuration imports the package @lovable.dev/vite-tanstack-config, declared MIT in npm registry metadata. Its code is installed as a build dependency rather than copied into this repository: https://registry.npmjs.org/@lovable.dev%2fvite-tanstack-config

Other dependency code is resolved from the package manifests and lockfiles; it is not vendored in this source tree.
