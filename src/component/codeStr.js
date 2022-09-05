export const codeStr = `/*为了避免递归调用会出现的问题，
*在函数体内只支持var关键字定义的变量监听变化
*/
function sort(arr) {
    for(let i = 0; i < arr.length - 1; i++) {  
        for(let j = 0; j < arr.length - 1 - i; j++) {
            if(arr[j] > arr[j+1]) {
                let temp = arr[j+1];
                arr[j+1] = arr[j];
                arr[j] = temp;
            }
        }
    }
}
let test = [10,2,7,4,5,9,29,3,15,5]
sort(test);
`

export const codeStr2 = `
function sort(arr) {
    if(arr.length === 1) {
        return arr;
    }
    const mid = Math.floor(arr.length / 2);
    const left = arr.slice(0, mid);
    const right = arr.slice(mid, arr.length);
    const orderLeft = sort(left);
    const orderRight = sort(right);
    const res = [];
    while(orderLeft.length || orderRight.length) {
        if(orderLeft.length && orderRight.length) {
            res.push(orderLeft[0] < orderRight[0] ? orderLeft.shift() : orderRight.shift());
        } else if(orderLeft.length) {
            res.push(orderLeft.shift());
        } else if(orderRight.length) {
            res.push(orderRight.shift());
        }
    }
    return res;
  }
  var test = [5,2,4];
  test = sort(test);
  console.log(test, 'test')
  `

export const insertionSort = `/*由于函数递归调用必须要有块级作用域，
*在函数体内只支持var关键字定义的变量监听变化,let、const正常执行
*/
function insertionSort(arr) {
    for(var i = 0; i < arr.length; i++) {
        var temp = arr[i];
        var j = i;
        while(j > 0) {
            if(arr[j - 1] > temp) {
                arr[j] = arr[j - 1];    
            } else {
                break;
            }
            j--;
        }
        arr[j] = temp;
    }
}
let test = [10,2,7,4,20,5,6]
insertionSort(test);
`