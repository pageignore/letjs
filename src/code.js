
// 用于传递到js执行代码的全局响应式变量名
export const GLOBALSTATE = 'LETJS_STATE';

/**
 * 代码中定义的变量集合
 */
export const VARIABLESETS = new Set();

/**
 * 二叉树的ast节点类型
 */
export const TYPEOfBT = ['AssignmentExpression', 'LogicalExpression', 'BinaryExpression'];


/**
 * 通过js抽象语法树替换js代码中的变量为全局响应式对象引用
 * @param {Array} astBody js抽象语法树body
 * @param {Set} VARIABLESETS 变量名Set容器
 * @returns net ast 替换后的抽象语法树
 */
 export function transform(astNote , isInFn = false, isInitInFor = false) {
    if(!astNote) return;
    astNote = isNeedChange(astNote) ? valChange(astNote.name) : astNote;
    
    // 变量类型 函数体内为了避免递归调用的情况，只允许 var 声明的变量响应式
    if(astNote.type === 'VariableDeclaration' && (!isInFn || (isInFn && astNote.kind == 'var'))) {
        setVariables(astNote);
        astNote = variablesChange(astNote, isInFn, isInitInFor);
    } else if(astNote.type === 'VariableDeclaration' && isInFn && astNote.kind != 'var') {
        // 函数体内非var 定义的变量 寻找右边的赋值，如果有引用var定义的变量则要替换
        astNote.declarations = astNote.declarations.map(item => {
            if(item.init.type === 'VariableDeclaration') {
                item.init = isNeedChange(item.init) ? valChange(item.init.name) : item.init;
            } else {
                item.init = transform(item.init);
            }
            return item;
        });
    }

    // 属性操作符
    if(astNote.type === 'MemberExpression') {
        if(isNeedChange(astNote.object)) {
            astNote.object = valChange(astNote.object.name);
        } else {
            astNote.object = transform(astNote.object, isInFn);
        }
        if(isNeedChange(astNote.property)) {
            if(astNote.object.name != GLOBALSTATE) {
                // 对象不是全局响应式对象
                astNote.property = valChange(astNote.property.name);
            } else {
                // 如果对象已经是全局定义的响应式对象就不再处理替换，不然会死循环
                astNote.property = astNote.property;
            }
        } else {
            astNote.property = transform(astNote.property, isInFn);
        }
    }

    // 赋值表达式
    if(TYPEOfBT.indexOf(astNote.type) >= 0) {
        if(astNote.left) astNote.left = transform(astNote.left, isInFn);
        if(astNote.right) astNote.right = transform(astNote.right, isInFn);
    }

    // 函数调用
    if(astNote.type === 'CallExpression') {
        if(astNote.arguments) astNote.arguments = astNote.arguments.map(item => transform(item, isInFn));
        if(astNote.callee) astNote.callee = transform(astNote.callee, isInFn);
    }

    // return 语句
    if(astNote.type === 'ReturnStatement' && astNote.argument) {
        if(isNeedChange(astNote.argument)) {
            astNote.argument = valChange(astNote.argument.name)
        } else {
            if(astNote.argument.left) astNote.argument.left = transform(astNote.argument.left, isInFn);
            if(astNote.argument.right) astNote.argument.right = transform(astNote.argument.right, isInFn);
        }
    }

    // 表达式
    if(astNote.type === 'ExpressionStatement') {
        if(astNote.expression) astNote.expression = transform(astNote.expression, isInFn);
    }

    // if语句 三元运算符
    if(astNote.type === 'IfStatement' || astNote.type === 'ConditionalExpression') {
        astNote.test = transform(astNote.test);
        if(astNote.consequent) astNote.consequent = transform(astNote.consequent, isInFn);
        if(astNote.alternate) astNote.alternate = transform(astNote.alternate, isInFn);
    }

    // i++
    if(astNote.type === 'UpdateExpression') {
        if(astNote.argument) astNote.argument = transform(astNote.argument, isInFn);
    }

    // 函数体继续寻找变量
    if(astNote.type === 'FunctionDeclaration') {
        astNote.body.body = astNote.body.body.map(item => transform(item, true));
    }

    // While循环
    if(astNote.type === 'WhileStatement') {
        astNote.test = transform(astNote.test);
        astNote.body.body = astNote.body.body.map(item => transform(item, isInFn));
    }

    // for循环
    if(astNote.type === 'ForStatement') {
        astNote.init = transform(astNote.init, isInFn, true);
        astNote.test = transform(astNote.test, isInFn);
        astNote.update = transform(astNote.update, isInFn);
        astNote.body.body = astNote.body.body.map(item => transform(item, isInFn));
    }

    if(astNote.type === 'BlockStatement') {
        if(astNote.body) astNote.body = astNote.body.map(item => transform(item, isInFn));
    }

    if(astNote.type === 'Program') {
        astNote.body = astNote.body.map(item => transform(item, isInFn));
    }

    return astNote;
}

/**
 * js执行代码顶部添加全局响应式变量引用定义
 * const LETJS_STATE = this;
 * 
 * @param {*} ast 抽象语法树
 * @returns 返回添加了全局state变量的抽象语法树
 */
 export function unshiftStateCode(ast) {
    if(!ast || ast.type != 'Program') return;
    // 头部添加全局变量用于绑定响应式数据
    // const LETJS_STATE = this;
    let codeNode = {
        type: 'VariableDeclaration',
        declarations: [
            {
                type: 'VariableDeclarator',
                id: {
                    type: 'Identifier',
                    name: GLOBALSTATE
                },
                init: {
                    type: 'ThisExpression'
                }
            }
        ],
        kind: "const"
    }
    ast.body.unshift(codeNode);
    return ast;
}

/**
 * 定义的函数替换 全局响应式对象的引用
 * @param {*} node 
 * @param {*} isInitInFor 是否 for循环内 
 * @returns 
 */
function variablesChange(node, isInitInFor) {
    if(!node) return node;
    let declarations = node.declarations;
    if(declarations.length > 1) {
        // 多个函数定义语句
        node = manyVarChange(declarations, isInitInFor);
    } else {
        node = oneVarChange(declarations[0], isInitInFor);
    }
    return node;
}

/**
 * 单个变量定义 let a = 1;
 * @param {*} declaration 
 * @param {*} isInitInFor 
 * @returns 
 */
function oneVarChange(declaration, isInitInFor) {
    let node = {
        type: 'ExpressionStatement',
    }
    let expression = {
        type: 'AssignmentExpression',
        operator: '=',
        left: isNeedChange(declaration.id) ? valChange(declaration.id.name) : declaration.id,
        right: isNeedChange(declaration.init) ? valChange(declaration.init.name) : declaration.init,
    }
    node.expression = expression;
    return isInitInFor ? expression : node;
}

/**
 * 多个变量定义 let a = 1,b = 2;
 * @param {*} declaration 
 * @param {*} isInitInFor 
 * @returns 
 */
function manyVarChange(declarations, isInitInFor) {
    let node = {
        type: 'ExpressionStatement',
    }
    let expression =  {
        type: 'SequenceExpression',
        expressions: []
    }
    node.expression = expression;
    declarations.forEach(item => {
        let assignmentExpression = {
            type: 'AssignmentExpression',
            operator: '=',
            left: isNeedChange(item.id) ? valChange(item.id.name) : item.id,
            right: isNeedChange(item.init) ? valChange(item.init.name) : item.init,
        }
        expression.expressions.push(assignmentExpression);
    })
    return isInitInFor ? expressionStatement : node;
}


/**
 * 替换变量节点
 * @param {*} node 变量名称
 * @returns 
 */
function valChange(name) {
    return {
        type: 'MemberExpression',
        computed:false,
        object:{
            type: 'Identifier',
            name: GLOBALSTATE
        },
        property:{
            type: 'Identifier',
            name
        }
    }
}

/**
 * 判断节点是否需要替换
 * @param {*} node 
 * @returns 
 */
function isNeedChange(node) {
    // 如果是变量类型，且是通过定义的变量，非函数传参
    return node.type === 'Identifier' && VARIABLESETS.has(node.name);
}

/**
 * 通过变量节点设置定义的变量集合
 * @param {*} astNote 
 */
function setVariables(astNote) {
    astNote.declarations.forEach(varItem => {
        // 变量名 a; let a = '11'
       let name = varItem.id.name;
       // 同名 变量名后面加_
       if(VARIABLESETS.has(name)) {
           name += '_'; 
       }
       VARIABLESETS.add(name);
   })
}
