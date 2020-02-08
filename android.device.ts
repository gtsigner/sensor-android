import { Util } from '@app/utils/core/utils';
import * as Crypto from 'crypto';
import { Device } from '@app/nike/entity/device';
import { DeviceEntry } from '@app/nike/entity/device.entry';
import * as lodash from 'lodash';
import * as uuid from 'uuid/v4';
import * as StringRandom from 'string-random';
import * as faker from 'faker';
import * as dayjs from 'dayjs';

/**
 * Android Device
 */
export class AndroidDevice implements Device {
    public static readonly CountryISO_CHN: string = 'CHN';
    public static screenSizes = [
        '854,480',
        '800,480',
        '1280,800',
        '2560,1600',
        '1920,1080',
        '2560,1440',
        '1280,768',
        '1920,1200',
        '1920,1032',
    ];
    public static versions = [
        { version: '7.0', code: '24' },
        { version: '7.1', code: '25' },
        { version: '8.0.0', code: '26' },
        { version: '8.1.0', code: '27' },
        { version: '8.1.0', code: '27' },
    ];
    /**
     * 品牌
     */
    public static readonly brands = [
        'samsung',
        'Huawei',
        'TCL',
        'MEIZU',
        'Sony',
        'Lenovo',
        'OPPO',
        'vivo',
        'A7',
        'Acer',
        'Asus',
        'LG',
        'Sony',
        'HTC',
        'ZTE',
        'HTC',
    ];


    public static readonly devices = [
        {
            model: 'Pixel',
        },
    ];

    //这个应该是产品的名称
    public static readonly models = [
        'S8',
        'NOTE7',
        'Pixel',
        'Pixel 2',
        'Pixel 2XL',
        'Pixel 3',
    ];
    public static readonly product_names = ['gmini', 'shamu', 'aosp', 'ota', 'muid', 'U8860'];
    public static readonly devices_names = ['gmini', 'shamu', 'aosp', 'user', 'U8860'];

    public readonly clientType: string = 'com.nike.commerce.snkrs.droid';
    public static readonly clientType: string = 'com.nike.commerce.snkrs.droid';
    public static readonly clientId: string = 'qG9fJbnMcBPAMGibPRGI72Zr89l8CD4R';
    public readonly clientId: string = 'qG9fJbnMcBPAMGibPRGI72Zr89l8CD4R';

    //aes
    public static aesKey = Buffer.from([
        16,
        -59,
        20,
        -5,
        -54,
        -85,
        110,
        61,
        -51,
        -99,
        70,
        -78,
        11,
        -44,
        3,
        5,
        -120,
        58,
        -14,
        74,
        13,
        -122,
        35,
        120,
        14,
        -60,
        67,
        73,
        -58,
        -90,
        42,
        112,
    ]);

    /**
     * 生成设备ID数据
     * @param bean
     */
    public static createDeviceId(bean: DeviceEntry): string {
        let info = '0500';
        const map: any = {
            MACA: bean.amac || '02:00:00:00:00:00', //真实mac地址
            AFPID: Util.Coder.md5_fingerprint(bean.finger), //指纹信息MD5,特殊md5 只有31位长度
            BMACA: bean.bmaca || '02:00:00:00:00:00', //蓝牙的mac地址 地址,可以默认:02:00:00:00:00:00
            ADSV: bean.build.version.release || '8.1.0', //android版本
            ADLO: bean.iso3Country || 'CHN', //getISO3Country
            AMID: bean.androidId || '', //deviceId
            ASL: bean.build.sdkINT || '', //sdk 版本号
            ADM: bean.build.model || '', //品牌 MI 5 Build.MODEL
            CLIENT_TIME: AndroidDevice.getClientTime(),
            ABN: bean.build.display || '', //代号，NRD90M，buildId Build.DISPLAY
            BBSC: bean.deviceType || 'Android', //设备类型Android
            // AKV: '3.18.0994-' + faker.name.title, //TODO 可是空
            // AKD: bean.build.proc || '', //这个是android /proc/version 中的值
            // AKID: 'builder@c3-ota-bd27 ' + Math.random(),
            // ANID: bean.telId || '', //552649638923549 15个字符串的
            // AKBN: ')',
        };
        let enc = AndroidDevice.serializationInfo(map);
        info += AndroidDevice.encrypt(enc);
        return info;
    }

    public static getFingerprint(device: DeviceEntry): string {
        //每个相同的系统指纹数据是一样的
        //Xiaomi/gemini/gemini:7.0/NRD90M/7.10.19:user/release-keys mi5-2
        //Xiaomi/gemini/gemini:7.0/NRD90M/7.10.19:user/release-keys mi5-1
        //google/shamu/shamu:7.1.1/N6F27H/4072753:user/release-keys
        return `${device.product.brand}/${device.product.name}/${device.product.device}:${device.build.version.release}/${device.build.id}/${device.build.version.incremental}:${device.build.type}/${device.build.tags}`;
    }

    /**
     * 创建新的设备信息数据
     * @param username
     * @param countryISO CHN
     * @param locale
     */
    public static createDevice = (username: string, countryISO: string = 'CHN', locale: string = 'zh_CN'): DeviceEntry => {
        const v = lodash.sample(AndroidDevice.versions);
        const brand = lodash.sample(AndroidDevice.brands);
        const dev_name = lodash.sample(AndroidDevice.devices_names);
        const prod_name = lodash.sample(AndroidDevice.product_names);
        const model = lodash.sample(AndroidDevice.models);
        let telId: any = StringRandom(15, { numbers: true, letters: false }).split('');
        telId.shift();
        telId = telId.join('');

        const dayStr = dayjs().subtract(1, 'year').subtract(30, 'day').toJSON();
        const buildId = StringRandom(6).toUpperCase();
        const device: DeviceEntry = {
            clientId: AndroidDevice.clientId,
            build: {
                id: buildId, //应该是随机生产的
                display: buildId, //不清楚，先随机生产吧
                type: 'user', //默认
                tags: 'release-keys', //默认
                model: model,
                user: 'builder',
                board: prod_name, //和product.name 差不多
                host: 'ubuntu',
                version: {
                    release: v.version, //固件版本
                    incremental: lodash.random(4072753, 5072753) + '', //基带版本
                    codename: 'REL', //
                    manufacturer: brand, //生产厂家
                },
                sdkINT: v.code,
                proc: `#1 SMP PREEMPT ${dayStr}`,
            },
            product: {
                name: prod_name,
                device: dev_name,
                brand: brand,
            },
            screenSize: lodash.sample(AndroidDevice.screenSizes),
            //12月修改成默认
            // amac: faker.internet.mac(),
            amac: '02:00:00:00:00:00', //蓝牙的MAC地址
            bmaca: '02:00:00:00:00:00', //蓝牙的MAC地址
            // bmaca: faker.internet.mac(), //蓝牙的MAC地址
            deviceId: uuid(),
            telId: telId,//IMEI
            androidId: Util.Coder.md5_encode('android_id ' + username).substring(0, 16),
            deviceType: 'Android',
            iso3Country: countryISO,
            locale: locale,
            deviceTypeName: AndroidDevice.clientType,
            username: username,
            finger: '',
            runtime: {
                uptime: Date.now() - (60 * 60 * 24 * 1000),//2天前启动的
            },
        };
        device.finger = AndroidDevice.getFingerprint(device);
        return device;
    };

    /**
     * 序列化参数
     * @param map
     */
    public static serializationInfo(map: any): string {
        let str = '';
        if (!map) {
            str += '0';
        } else {
            const keys = Object.keys(map);
            str += keys.length.toString(16).padStart(4, '0');
            for (let k in map) {
                //key
                str += k.length.toString(16).padStart(4, '0');
                str += k;

                //val
                str += map[k].length.toString(16).padStart(4, '0');
                str += map[k];
            }
        }
        return str;
    }

    /**
     * 反序列化参数
     * @param str
     */
    public static deSerializationInfo(str: string): any {
        const map: any = {};
        let v = str.substring(4, str.length - 4); //0500
        const head = v.substring(0, 4); //头部
        const mapLen = parseInt(head, 16);
        v = v.slice(4);
        for (let i = 0; i < mapLen; i++) {
            //key
            let keyHead = v.substring(0, 4); //头部
            v = v.slice(4);
            let len = parseInt(keyHead, 16);
            const key = v.substring(0, len);
            v = v.slice(len);

            //body
            keyHead = v.substring(0, 4); //头部
            v = v.slice(4);
            len = parseInt(keyHead, 16);
            const val = v.substring(0, len);
            v = v.slice(len);
            map[key] = val;
        }
        return map;
    }

    /**
     * 加密字符串
     * @param str
     */
    public static encrypt(str: string): string {
        //1.加密字符串
        let i: number;
        let byteArray = Buffer.from('0500' + str);
        if (byteArray.length % 16 === 0) {
            i = 0;
        } else {
            i = 16 - (byteArray.length % 16);
        }
        const bf = Buffer.from(
            new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
            0,
            i,
        );
        byteArray = Buffer.concat([byteArray, bf]);

        //AES 加密部分
        const iv = Crypto.randomBytes(16);
        const cipher = Crypto.createCipheriv('aes-256-cbc', this.aesKey, iv);
        cipher.setAutoPadding(false);
        let crypted = cipher.update(byteArray, undefined, 'hex');
        const buf = Buffer.from(crypted, 'hex');
        const buffers = Buffer.concat([iv, buf]);
        return buffers.toString('base64');
    }

    /**
     * 解密字符串
     * @param str
     */
    public static decrypt(str: string) {
        //1.读取向量
        const bf = Buffer.from(str, 'base64');
        const valLen = bf.length - 16;
        const valBuf = Buffer.alloc(valLen);
        bf.copy(valBuf, 0, 16);
        const iv = bf.slice(0, 16);
        const decipher = Crypto.createDecipheriv('aes-256-cbc', this.aesKey, iv);
        decipher.setAutoPadding(false);
        //@ts-ignore
        return decipher.update(valBuf, 'base64', 'utf8');
    }

    /**
     * 获取客户端时间
     */
    public static getClientTime(): string {
        const date = new Date();
        let v = `${date.getUTCFullYear()} ${(date.getUTCMonth() + 1).toString().padStart(2, '0')} ${date.getUTCDate().toString().padStart(2, '0')} `;
        v += `${date.getUTCHours().toString().padStart(2, '0')}:`;
        v += `${date.getUTCMinutes().toString().padStart(2, '0')}:${date.getUTCSeconds().toString().padStart(2, '0')}.`;
        v += `${date.getUTCMilliseconds()}`;
        return v;
    }
}
