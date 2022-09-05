# letjs

在线的Javascript代码运行器  [立即体验](https://pageignore.github.io/letjs/)

基于codemirror编辑器，编辑代码直接在浏览器引擎运行。

通过操作js抽象语法树，使用@vue/reactivity响应式模块监听代码中使用var、let、const定义的变量，执行代码运行结束后可观察每一步的变化情况，方便进行一些js代码算法练习等。

注意：由于函数递归调用必须要有块级作用域，在函数体内只支持var关键字定义的变量监听变化,let、const正常执行


#### 开发环境启动

##### npm run dev

#### 打包构建

##### npm run build

