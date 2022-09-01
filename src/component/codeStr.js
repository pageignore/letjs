export const codeStr = `/*暂不支持递归调用；函数多次调用；
*变量名字避免相同（函数参数名也要跟变量不同）
*不支持局部变量
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
let test = [10,2,7,4]
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
  }
  let test = [5,2,4]
  sort(test);
  `

export const insertionSort = `/*暂不支持递归调用；函数多次调用；
*变量名字避免相同（函数参数名也要跟变量不同）
*不支持局部变量
*/
function insertionSort(arr) {
    for(let i = 0; i < arr.length; i++) {
        let temp = arr[i];
        let j = i;
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