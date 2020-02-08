import { DeviceEntry } from '@app/nike/entity/device.entry';
import { Tool } from '@app/akamai/common/akamai.tool';
import * as Crypto from 'crypto';
import * as lodash from 'lodash';
import * as Long from 'long';
import * as NodeRSA from 'node-rsa';
import { MotionEvent } from '@app/akamai/android/sensor/sensor';

export interface Options {
  accR3: any;
  gyR0: any;
  touch?: boolean;
}

//TODO 时间差需要优化
export class Akamai {
  /**
   * 记录一些数据
   */
  public readonly values_o = {
    textLen: 0, //o.d
    textG: 0,
    textH: 0,
    d: 0,

    k: '',
    c: '',

    ch: 0, //每次输入++

    device: '', //o.l
    motionCount: 0, //motion event count o.j
    l: '-1',
    error: '', //纪律异常数据 o.m
    // env: "do_en,do_en,t_en",//传感器是否开关
    env: 'do_en,do_en,t_en', //传感器是否开关
    performance: '', //性能测试数据
  };

  public readonly values_n = {
    up_millis: 0, //已近启动的事件
    current_time: new Date().getTime(), //当前时间错
    l: 0, //这里面如果有touch事件，那么这里面的值是1，在被传感器读取后变成0
    m: 0, //这里面如果有touch事件，那么这里面的值是1，在被传感器读取后变成0

    n: 0,
    h: 1800000,

    //-106 上传了这一个数据
    f: -1,
    g: 0,

    d: false,
    cf: 0,

    cg: 0, //cg 其实就是获取device信息 消耗的时间,cm新版
    getDeviceWastTime: 0,

    k: 50000,

    sensor_type: 1, //0 方向传感器，1.重力传感器  n.q -1 就是没有
  };

  public aesKey: string = '';
  public hmacKey: string = '';
  private readonly aesKeyBuffer: Buffer;
  private readonly hmacKeyBuffer: Buffer;

  public readonly rsaKey: string = '';

  //这个到时候会上传
  private readonly rsaEncAesKey: string = '';
  private readonly rsaEncHmacKey: string = '';

  //固定设备信息
  public device: DeviceEntry = null;
  public motion: MotionEvent = new MotionEvent();
  public static version = '2.2.1';

  //拆分标签
  public static Tags = [
    '-1,2,-94,-70,',
    '-1,2,-94,-80,',
    '-1,2,-94,-90,',
    '-1,2,-94,-100,',
    '-1,2,-94,-101,',
    '-1,2,-94,-102,',
    '-1,2,-94,-103,',
    '-1,2,-94,-104,',
    '-1,2,-94,-105,',
    '-1,2,-94,-106,',
    '-1,2,-94,-107,',
    '-1,2,-94,-108,',
    '-1,2,-94,-109,',
    '-1,2,-94,-110,',
    '-1,2,-94,-111,',
    '-1,2,-94,-112,',
    '-1,2,-94,-113,',
    '-1,2,-94,-115,',
    '-1,2,-94,-116,',
    '-1,2,-94,-117,',
    '-1,2,-94,-118,',
    '-1,2,-94,-119,',
    '-1,2,-94,-120,',
    '-1,2,-94,-121,',
    '-1,2,-94,-122,',
    '-1,2,-94,-123,',
    '-1,2,-94,-124,',
    '-1,2,-94,-143,',
    '-1,2,-94,-142,',
    '-1,2,-94,-145,',
    '-1,2,-94,-144,',
  ];
  public static SensorDataKeyMap = {
    '-1,2,-94,-100,': 'device.info',
    '-1,2,-94,-101,': 'sensor.status',
    '-1,2,-94,-102,': 'o.k',
    '-1,2,-94,-108,': 'o.c',
    '-1,2,-94,-117,': 'motion.events',
    //其中r3 是重力之类的传感器，r0陀螺仪
    '-1,2,-94,-111,': 'r3.a.a', //acc R3.a.a
    '-1,2,-94,-109,': 'r0.a.a',
    '-1,2,-94,-144,': 'r3.a.c',
    '-1,2,-94,-142,': 'r3.a.b',
    '-1,2,-94,-145,': 'r0.a.c',
    '-1,2,-94,-143,': 'r0.a.b',
    '-1,2,-94,-115,': 'sensor.verify',

    '-1,2,-94,-106,': 'n.f,n.g',
    '-1,2,-94,-120,': 'o.errors',
    '-1,2,-94,-112,': 'o.performance',

    '-1,2,-94,-103,': 'activity.events',
  };

  //MOCK activity Events
  public static readonly ActivityEventsPool: string[] = [
    '',
    '',
    '3',
    '2,3',
    '3,2,3',
    '2,3,2,3',
    '3,2,3,2,3',
  ];

  public static readonly rsaKeyJavaCode: string = 'MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQC4sA7vA7N/t1SRBS8tugM2X4bByl0jaCZLqxPOql+qZ3sP4UFayqJTvXjd7eTjMwg1T70PnmPWyh1hfQr4s12oSVphTKAjPiWmEBvcpnPPMjr5fGgv0w6+KM9DLTxcktThPZAGoVcoyM/cTO/YsAMIxlmTzpXBaxddHRwi8S2NvwIDAQAB';

  private readonly systemUpTime = Date.now();

  /**
   * 依赖不同的事件，生成不同的策略数据
   * 生成sensor event data
   * @param gyR0
   * @param accR3
   * @param options
   */
  public createSensorString(gyR0, accR3, options: any = {}): string {
    const timeNow = new Date().getTime();
    const upMisNow = this.getUpTimeMillis();
    let str = '';
    //头部
    str += Akamai.version; //系统的版本号
    str += '-1,2,-94,-100,'; //设备信息

    //o.l 固定设备信息  基本OK
    let deviceInfo = this.values_o.device;

    const len = Tool.charPlus(str); //对的
    deviceInfo += ',';
    deviceInfo += len; //j.l(r0)  OK
    deviceInfo += ',';
    deviceInfo += lodash.random(1280303722, 1295607044); //确实是随机数
    deviceInfo += ',';
    deviceInfo += Math.ceil(timeNow / 2); //时间错/2
    str += deviceInfo;

    //OK,随机生成几个就可以了 基本OK
    //第一个值是定位传感器，(do_en,do_unr,do_dis) 开启，不可靠，关闭
    //第二个是传感器是否开启(do_en,do_dis) 这里面表示是否有xx之类的传感器
    str += '-1,2,-94,-101,'; //TAG
    str += this.values_o.env;

    //end 上面部分基本固定

    //o.k
    str += '-1,2,-94,-102,'; //TAG
    str += this.values_o.k;

    //o.c
    str += '-1,2,-94,-108,'; //TAG
    str += this.values_o.c;

    //有数据 一般是一个空置 OK
    //o.f399a  猜测是按钮点击后出现的数据 motionEvent
    //首页有，注册页面然后是,个人中心页面有
    //2,1435,0,0,1,1,1,-1;3,87,0,0,1,1,1,-1;
    const motions = this.motion.mock(); //貌似大部分页面都没有检测这个数据

    str += '-1,2,-94,-117,'; //TAG
    str += motions.str; //

    //r3 方向传感器 AccObs
    let sensorR3 = accR3;
    //sensorR3 = AkamaiMock.DefaultAcc;//使用默认的ACC

    //r0 陀螺仪 TYPE_GYROSCOPE
    let sensorR0 = gyR0;

    //r4.f396a =A r4.f396a，里面包含了许多传感器的数据，模拟器里面是没有这个传感器的数据的
    str += '-1,2,-94,-111,'; //TAG
    str += sensorR3.a.a;

    //TODO 主要重要的数据 A
    //r7.f396a=a
    str += '-1,2,-94,-109,'; //tag
    str += sensorR0.a.a; //可以大批量生成然后设计

    //r3.c   下单检出的时候也有数据
    str += '-1,2,-94,-144,'; //tag
    str += sensorR3.a.c;

    //r4.b ， r3=a 传感器的数据，
    str += '-1,2,-94,-142,'; //tag
    str += sensorR3.a.b;

    str += '-1,2,-94,-145,';
    str += sensorR0.a.c;

    str += '-1,2,-94,-143,'; //tag
    str += sensorR0.a.b;

    //Sensor Data, Misc Stat 这里面的数据也包含上面的  Orientation Event count,应该存在一些校验数据 TODO 这里比较重要了
    str += '-1,2,-94,-115,';
    //0,0,7388335811,15717294094,
    //23105629905,2001154,0,0,
    //128,128,17000,0,
    //1,-1243032629736711166,1571047031782,0

    let r11 = this.getUpTimeMillis() - upMisNow + 100; //获取启动时间
    r11 = r11 * 1000;

    const c_time = this.values_n.current_time - new Date().getTime(); //r13

    const o = this.values_o;
    const n = this.values_n;

    let sec = '';
    let total_b = o.d + motions.b + sensorR3.b + sensorR0.b;
    let total_c = sensorR0.c + sensorR3.c + motions.j + o.ch;

    let v1 = Akamai.verify103(total_c, c_time, total_c, sensorR0.c); //生产验证数据值

    sec += `${o.d},${motions.b},${sensorR3.b},${sensorR0.b},`; //1-4 OK
    sec += `${total_b},${c_time},${o.ch},${motions.j},`; //5-8 OK
    //9+
    sec += `${sensorR3.c},${sensorR0.c},${n.cg * 1000},${r11},`; //OK
    //13+
    sec += `${n.sensor_type},${v1},${n.current_time},0`; //OK

    str += sec;

    //logger.info(`结果校验`);

    //tag  OK固定数据 WEB 端有数据
    //n.f,n.g
    str += '-1,2,-94,-106,';
    str += `${this.values_n.f},${this.values_n.g}`;

    //o.m 记录错误信息
    str += '-1,2,-94,-120,'; //tag
    str += this.values_o.error;

    //o.n   这里面是包含的手机各种计算性能的数据而已，这里面的数据只会在app初始化的时候生成，所以可以固定下来
    str += '-1,2,-94,-112,'; //tag
    str += this.values_o.performance;

    //最后一个数据,activity的切换数据,随机生成，可以是空，但是比需要是
    str += '-1,2,-94,-103,'; //tag
    //随机3种行为
    str += this.createActivityEvents();

    return str;
  }

  /**
   * 获取启动时间
   */
  public getUpTimeMillis(): number {
    return new Date().getTime() - this.systemUpTime;
  }

  public constructor(device: DeviceEntry) {
    this.device = device;

    //README:https://stackoverflow.com/questions/21367907/generate-aes-key-on-node
    this.aesKeyBuffer = Crypto.randomBytes(128 / 8);
    this.hmacKeyBuffer = Crypto.randomBytes(256 / 8);
    this.aesKey = this.aesKeyBuffer.toString('base64');
    this.hmacKey = this.hmacKeyBuffer.toString('base64');

    this.rsaKey = Tool.convertJavaCodeToPem(Akamai.rsaKeyJavaCode);
    const rsa = new NodeRSA(this.rsaKey);
    rsa.setOptions({ encryptionScheme: 'pkcs1' });
    this.rsaEncAesKey = rsa.encrypt(this.aesKeyBuffer, 'base64');
    this.rsaEncHmacKey = rsa.encrypt(this.hmacKeyBuffer, 'base64');
    this.systemUpTime = device.runtime.uptime || new Date().getTime() - 60 * 1000 * 60 * 24; //设置一个系统启动时间

    //https://cnodejs.org/topic/52d4d6e8e20b7c8214887df2
    // this.rsaEncAesKey = Crypto.publicEncrypt(this.rsaKey, this.aesKeyBuffer).toString('base64');
    // this.rsaEncHmacKey = Crypto.publicEncrypt(this.rsaKey, this.hmacKeyBuffer).toString('base64');
    this._init();
  }

  /**
   * 产生数据目前需要添加传感器的数据
   * @param options
   */
  public createSensorData(options: Options) {
    let events = this.createSensorString(options.gyR0, options.accR3);
    return Akamai.encryptSensorStr(
      this.rsaEncAesKey,
      this.rsaEncHmacKey,
      this.aesKeyBuffer,
      this.hmacKeyBuffer,
      events,
    );
  }

  /**
   * 初始化 一些固定不变的数据
   * @private
   */
  private _init() {
    //performances 固定随机就可以了
    const list = [
      '7,4,59,37,2600,34,1700,16,3587',
      '7,6,59,22,200,10,600,5,1154',
      '7,3,59,12,800,16,800,7,1436',
      '13,136,59,143,400,12,400,3,2022',
      '13,117,59,144,1100,19,600,5,1951',
      '12,61,59,108,900,17,400,3,1129',
      '13,140,59,144,900,17,200,1,1775',
      '12,59,59,80,600,14,500,4,1420',
      '13,151,59,118,1100,19,300,2,1852',
      '13,109,59,134,1400,22,100,0,1701',
      '17,722,59,923,23200,240,8300,82,9040',
      '17,636,59,776,21400,222,8400,83,8897',
      '12,76,59,127,2200,30,100,0,2058',
      '8,8,59,70,900,17,100,0,1448',
    ];
    this.values_o.performance = lodash.sample(list);

    const deviceInfo = Akamai.buildDeviceString(this.device);
    this.values_o.device = deviceInfo.info;
    this.values_n.getDeviceWastTime = deviceInfo.time;
  }

  /**
   * 构建设备的字符串信息
   * @param deviceEntry
   */
  private static buildDeviceString(deviceEntry: DeviceEntry) {
    let deviceInfo = '';
    //设备信息
    let model = deviceEntry.build.model;
    let version = deviceEntry.build.version.release;
    let screenSize = deviceEntry.screenSize;
    const devUUid = deviceEntry.deviceId;
    const sdkINT = deviceEntry.build.sdkINT;
    const bootloader = 'unknown';
    //const hardware = 'android_x86';
    const hardware = deviceEntry.build.board;
    const packageName = 'com.nike.snkrs';
    const androidId = deviceEntry.androidId;
    const codename = deviceEntry.build.version.codename;

    deviceInfo += '-1,uaend,-1,'; //固定
    deviceInfo += screenSize;
    deviceInfo += ',1,95,'; //电源 1,95 0,100
    deviceInfo += '1,zh,'; //屏幕放心，语言
    deviceInfo += version; //OK
    deviceInfo += ',0,'; //accelerometer_rotation 1,0
    deviceInfo += model;
    deviceInfo += `,${bootloader},${hardware},-1,${packageName},-1,-1,`; //其余几个值调用了a
    //判断版本
    // if (sdkINT >= 26) {
    //   deviceInfo += `${androidId},`;
    // } else {
    //   deviceInfo += `${devUUid},`;
    // }
    deviceInfo += `${devUUid},`;
    deviceInfo += '-1,0,0,'; //-1,keyboard,是否开启adb
    const incremental = deviceEntry.build.version.incremental;
    //REL REL,47,25,motorola
    deviceInfo += `${codename},${incremental},${sdkINT},`;
    //str13+product
    const product = deviceEntry.product.name;
    const tags = deviceEntry.build.tags;
    const type = deviceEntry.build.type;
    const user = deviceEntry.build.user;
    const host = deviceEntry.build.host;
    const display = deviceEntry.build.display;
    const board = deviceEntry.build.board;
    const id = deviceEntry.build.id;
    let brand = deviceEntry.product.brand;
    let device = deviceEntry.product.device;
    let finger = deviceEntry.finger;

    deviceInfo += `${brand},${product},${tags},${type},${user},`;
    deviceInfo += `${display},${board},${brand},${device},${finger},`;
    deviceInfo += `${host},${id}`;

    const time = lodash.sample([7, 17, 10, 12, 13]);
    return { info: deviceInfo, time: time };
  }

  /**
   * OK 校验数据生成结果
   * @param total_b
   * @param r4  系统时间差 c_time
   * @param total_c total_c值
   * @param r0c  ro.c
   */
  public static verify103(total_b: number, r4: number, total_c: number, r0c: number): Long {
    let r9 = 32;
    let r8 = Long.fromNumber(total_b).shl(32); //右移动32位
    let r5: any = Long.fromNumber(total_c);
    let r15: any = 4294967295;
    r5 = r5.and(4294967295).or(r8);
    let r2 = r5.toInt(); //
    r5 = r5.shr(32).toInt();
    let r6 = r2;
    r2 = 0;
    let r30 = 0;
    while (true) {
      r15 = 16;
      if (r2 >= r15) {
        break;
      }
      let lr4 = Long.fromNumber(r4);
      r15 = lr4.shl(r2);
      let r16: any = 32 - r2; //减去
      r16 = lr4.shru(r16).toInt();
      r15 = r15.or(r16).xor(r6);
      r5 = Long.fromNumber(r5).xor(r15);
      r2++;
      r30 = r6;
      r6 = r5;
      r5 = r30;
    }
    let m9 = Long.fromNumber(r6).and(4294967295);
    return Long.fromNumber(r5).shl(32).xor(m9);
  }

  //str += "2,1570812639279;3,1570812639291;2,1570812640513;3,1570812640522;";
  //2,15708148786663,15708148787023,15708148788822,1570814878888
  //2=停止,3=启动
  public createActivityEvents(): string {
    let time = new Date().getTime();
    let mv = [];
    let tm = time + 1;
    const list = Akamai.ActivityEventsPool; //事件
    const rans = lodash.sample(list).split(',');
    if (rans.length <= 1) {
      return '';
    }
    rans.forEach(e => {
      tm += lodash.random(2000, 10000); //5-10s之前的切换
      mv.push(`${e},${tm}`);
    });
    return mv.join(';');
  }

  /**
   * 解密sensor-data 拆分
   * @param str
   */
  public static parseSplitData(str: string): any {
    const tags = Akamai.Tags;
    tags.forEach(tg => {
      const reg = new RegExp(`${tg}`, 'g');
      str = str.replace(reg, `FUCK${tg}FUCK`);
      //判断
    });
    for (let k in this.SensorDataKeyMap) {
      str = str.replace(k, this.SensorDataKeyMap[k]);
    }
    //2.做单项key=>val
    const map = {};
    let ll = str.split('FUCK').reverse();
    ll.pop();
    ll = ll.reverse();
    const r0 = {};
    const r3 = {};
    while (ll.length > 0) {
      const v = ll.pop();
      const k = ll.pop();
      if (k.indexOf('r0.') !== -1) {
        r0[k] = v;
      } else if (k.indexOf('r3.') !== -1) {
        r3[k] = v;
      } else {
        map[k] = v;
      }
    }
    //解析v
    const verify = Akamai.checkV(map['sensor.verify']);
    map['r0'] = {
      a: {
        a: r0['r0.a.a'].split(';'),
        b: r0['r0.a.b'],
        c: r0['r0.a.c'],
      },
      b: verify.sp.r0.b,
      c: verify.sp.r0.c,
    };
    map['r3'] = {
      a: {
        a: r3['r3.a.a'],
        b: r3['r3.a.b'],
        c: r3['r3.a.c'],
      },
      b: verify.sp.r3.b,
      c: verify.sp.r3.c,
    };
    map['r3.a.a'] = r3['r3.a.a'].split(';');
    map['r0.a.a'] = r0['r0.a.a'].split(';');
    return map;
  }

  /**
   * 验证103 数据是否正确
   * @param str
   */
  public static checkV(str: string) {
    const sp = Tool.splitFooter(str);
    let total_b =
      parseInt(sp.o.d) +
      parseInt(sp.motions.b) +
      parseInt(sp.r3.b) +
      parseInt(sp.r0.b);
    let total_c =
      parseInt(sp.r0.c) +
      parseInt(sp.r3.c) +
      parseInt(sp.motions.j) +
      parseInt(sp.o.ch);
    let v1 = Akamai.verify103(total_b, sp.c_time, total_c, sp.r0.c);
    return { v: v1.toString(), sp: sp };
  }

  /**
   * 加密数据
   * @param rsaEncAesKey
   * @param rsaEncHmacKey
   * @param aesKeyBuffer
   * @param hmacKeyBuffer
   * @param str
   */
  private static encryptSensorStr(rsaEncAesKey: string, rsaEncHmacKey: string, aesKeyBuffer: Buffer, hmacKeyBuffer: Buffer, str: string): string {
    let ret = '';
    ret += '1,a,';
    ret += rsaEncAesKey;
    ret += ',';
    ret += rsaEncHmacKey;
    ret += '$';

    //2000,1000,0
    const aesUptime = lodash.sample([1000, 2000, 0]); //一个时间而已
    const hmackUptime = lodash.sample([1000, 2000, 0]); //一个时间而已
    const b64uptime = lodash.sample([1000, 2000, 0]); //一个时间而已

    const iv = Crypto.randomBytes(16);
    const cipher = Crypto.createCipheriv('aes-128-cbc', aesKeyBuffer, iv);
    let buf: Buffer = Buffer.from(str);
    let cryBuf = cipher.update(buf);
    cryBuf = Buffer.concat([cryBuf, cipher.final()]);

    let encStr = Buffer.concat([iv, cryBuf]);

    //进行第二次加密,算是一个签名而已
    const hcry = Crypto.createHmac('SHA256', hmacKeyBuffer);
    const endBuf = hcry.update(encStr).digest();
    //最后
    ret += Buffer.concat([encStr, endBuf]).toString('base64');
    ret += '$';
    //enc end

    //下面是时间
    ret += `${aesUptime},${hmackUptime},${b64uptime}`;
    return ret;
  }

  /**
   * 加密
   * @param rsaKey
   * @param aesKey
   * @param ivStr
   * @param hmacKey
   * @param str
   */
  public static encrypt(rsaKey: any, aesKey: string, ivStr: string, hmacKey: string, str: string): string | null {
    try {
      const aesKeyBuf = Buffer.from(aesKey, 'base64');
      const hmacBuf = Buffer.from(hmacKey, 'base64');
      const rsaEncAesKey = Crypto.publicEncrypt(rsaKey, aesKeyBuf).toString(
        'base64',
      );
      const rsaEncHmacKey = Crypto.publicEncrypt(rsaKey, hmacBuf).toString(
        'base64',
      );
      let ret = '';
      ret += '1,a,';
      ret += rsaEncAesKey;
      ret += ',';
      ret += rsaEncHmacKey;
      ret += '$';
      //2000,1000,0
      const aesUptime = 2000; //一个时间而已
      const hmackUptime = 1000; //一个时间而已
      const b64uptime = 1000; //一个时间而已

      //enc start
      const iv = Buffer.from(ivStr, 'base64');
      const cipher = Crypto.createCipheriv('aes-128-cbc', aesKeyBuf, iv);
      let buf: Buffer = Buffer.from(str);
      let cryBuf = cipher.update(buf);
      cryBuf = Buffer.concat([cryBuf, cipher.final()]);

      let encStr = Buffer.concat([iv, cryBuf]);

      //进行第二次加密,算是一个签名而已
      const hcry = Crypto.createHmac('SHA256', hmacBuf);
      const endBuf = hcry.update(encStr).digest();
      //最后
      ret += Buffer.concat([encStr, endBuf]).toString('base64');
      ret += '$';
      //enc end

      //下面是时间
      ret += `${aesUptime},${hmackUptime},${b64uptime}`;
      return ret;
    } catch (e) {
      console.log(e);
      return null;
    }
  }

  /**
   * 解密
   * @param sensor_data
   * @param aesKey
   * @param hmacKey
   */
  public static decrypt(sensor_data: string, aesKey: string, hmacKey: string = '') {
    const list = sensor_data.split('$');
    const str = list[1];
    //1.解析aes秘钥
    console.log('解密字符串:', str);
    let buf = Buffer.from(str, 'base64');
    buf = buf.slice(0, buf.length - 32);
    //进行AES解密,计算出iv
    const ivBuf = buf.subarray(0, 16);
    const valBuf = buf.subarray(16, buf.length);
    const keyBuf = Buffer.from(aesKey, 'base64');
    console.log(
      '长度：',
      ivBuf.length,
      valBuf.length,
      ivBuf.toString('base64'),
    );
    const cipher = Crypto.createDecipheriv('aes-128-cbc', keyBuf, ivBuf);
    let cryBuf = cipher.update(valBuf);
    cryBuf = Buffer.concat([cryBuf, cipher.final()]); //这个是
    console.log('解密字符串结果：', cryBuf.toString('utf8'));
  }
}
