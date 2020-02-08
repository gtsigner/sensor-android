import * as lodash from 'lodash';
import { EventEmitter } from 'events';
import { Wcls } from '@app/akamai/common/bean/uls.bean';
import { Tool } from '@app/akamai/common/akamai.tool';
import * as Long from 'long';

//记录一些常量

export class EntryData {
}

export class TextEvent {
  public ch: number = 0; //每次输入会++
  public h: number = 0;
  public g: number = 0;
  public d: number = 0;
  public etIds = ''; //存储了Ids 123123;1231123;123

  public checkCount(): boolean {
    let j = this.ch;
    if (j != 1) {
      let i = j > 6 ? 1 : j == 6 ? 0 : -1;
      if (i != 0 && (i <= 0 || (j - 6) % 10 != 0)) {
        return false;
      }
    }
    return true;
  }
}

/**
 * Motion Touch Mock
 */
export class MotionEvent {
  public readonly move = 1;
  public readonly up = 3;
  public readonly down = 2;

  public b = 0; //几个数值计数之和

  public e = 0; //move事件 数量
  public f = 0; //up or down 事件 数量
  public j = 0; //2个事件综合

  public str = '';
  public readonly max = 50; //2个点最大的数值
  public ob = 0;

  /**
   * 2种事件最多产生50次
   * @param ev
   */
  public dispatch(ev) {
    this.j++;
    ev.type = ev.action === 1 ? 1 : 0;
    if ((ev.type !== 1 || this.e >= 50) && (ev.type === 1 || this.f >= 50)) {
      return;
    }
    //移动,type只有2种情况1,0,
    if (ev.type === this.move) {
      let tm = ev.time - ev.action;
      let str = `${ev.action},${tm},0,0,1,1,1,-1;`; //单项的数据
      this.b = ev.time - ev.action + ev.action + this.b;
      this.e++;
      this.str += str;
    } else {
      let tm = ev.time - ev.action;
      let str = `${ev.action},${tm},0,0,1,1,1,-1;`; //单项的数据
      this.b = ev.time - ev.action + ev.action + this.b;
      this.f++;
      this.str += str;
    }
  }

  public mock() {
    //生成随机事件
    const len = lodash.random(1, 100); //随机数据
    if (len > 40) {
      let isDown = false; //是否被按下
      for (let i = 0; i < len; i++) {
        const rand = lodash.random(1, 3); //随机生成一个
        if (rand === 2 && !isDown) {
          //被按下了
          isDown = true;
          const time = lodash.random(321, 3149); //随机生成一个
          this.dispatch({ action: rand, time: time });
          continue;
        }
        //在被touch up 调用之前，必须要有一个move，保证真实性
        if (rand === 3 && isDown) {
          isDown = false;
          //无论如何,只要被按下就需要加上一个move事件
          let time = lodash.random(6, 12); //随机生成一个
          this.dispatch({ action: 1, time: time });

          //抬起touch down
          time = lodash.random(6, 122); //随机生成一个
          this.dispatch({ action: 3, time: time });
          continue;
        }
        //必须要down才会有move事件
        if (rand === 1 && isDown) {
          const time = lodash.random(1, 20); //随机生成一个
          this.dispatch({ action: rand, time: time });
          continue;
        }
      }
      //最后的最后必须要有一个up事件，表示已经
      if (isDown) {
        //无论如何,只要被按下就需要加上一个move事件
        let time = lodash.random(6, 12); //随机生成一个
        this.dispatch({ action: 1, time: time });

        //抬起touch down
        time = lodash.random(6, 122); //随机生成一个
        this.dispatch({ action: 3, time: time });
      }
    }
    const ret = { str: this.str, e: this.e, f: this.f, j: this.j, b: this.b };
    this.clear();
    return ret;
  }

  public clear() {
    this.e = 0;
    this.f = 0;
    this.b = 0;
    this.j = 0;
    this.str = '';
  }

  /**
   * 解析+验证
   * @param str
   */
  public parse(str: string) {
  }

  getMockEvents() {
    const moveType = 1;
    const upType = 3;
    const downType = 2;
    let e = 0;
    let f = 0;
    let j = 0;
  }
}

//acc 传感器
export class AccSensor extends EventEmitter {
  public list: any = [];

  public getData() {
  }

  public clear() {
    this.list = [];
  }

  //打包数据
  public static pack(list: Wcls[]) {
    if (list.length <= 1) throw new Error('解析失败');

  }
}

export class SensorManager {

  public static getOrientation(R: Float32Array, values: Float32Array) {
    if (R.length == 9) {
      values[0] = Math.atan2(R[1], R[4]);
      values[1] = Math.asin(-R[7]);
      values[2] = Math.atan2(-R[6], R[8]);
    } else {
      values[0] = Math.atan2(R[1], R[5]);
      values[1] = Math.asin(-R[9]);
      values[2] = Math.atan2(-R[8], R[10]);
    }
    return values;
  }

  public static getRotationMatrix() {

  }

}

//陀螺仪传感器
export class GySensor extends EventEmitter {
  public list: any = [];

  public getData() {
  }

  public clear() {
    this.list = [];
  }

  //打包数据
  public static pack(list: Wcls[]) {
    if (list.length <= 1) throw new Error('解析失败');
    let a2: number = Tool.parseLong(list.length);
    let fArr = new Float32Array(a2);
    let fArr2 = new Float32Array(a2);
    let fArr3 = new Float32Array(a2);
    let fArr4 = new Float32Array(a2);
    let j2 = 0;
    let i = 0;
    for (let wVar of list) {
      let fArr5 = new Float32Array(9);

    }
    let c2 = Tool.parseFloatToPair(fArr);
    let c3 = Tool.parseFloatToPair(fArr2);
    let c4 = Tool.parseFloatToPair(fArr3);
    let a3 = Tool.floatToPair(fArr4, 0.0);
    let sb3 = `${c2.first}:${c3.first}:${c4.first}`;
    let longValue = Long.fromValue(c2.second).add(c3.second).add(c4.second);

  }
}
