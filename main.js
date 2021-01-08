const { DanmakuService } = require('bilibili-live')
const { album, search, song_url, song_detail } = require('NeteaseCloudMusicApi')
const axios = require('axios')

async function add_media(keyword) {
  try {
      const result = await search({
          keywords: keyword,
          type: 1,
          limie: 5
      })

      const music = result.body.result.songs[0];

      const music_id = music.id;

      const music_artist = await song_detail({
          ids: ""+music_id,
      });

      const songs_detail = await song_url({
          id: music_id,
      })

      const music_album =  music_artist.body.songs[0].al.picUrl;
      const music_url = songs_detail.body.data[0].url;

      // insert media
      await axios.post('http://127.0.0.1:4156/v1.1/media', {
          index: 0,
          type: "remix",
          audio: music_url,
          video: music_album+"?param=1024y576",
      })

      // skip media
      await axios.post('http://127.0.0.1:4156/v1.1/player/media/current/skip', {})

      // delete previous media
      const play_list = await axios.get('http://127.0.0.1:4156/v1.1/media', {})
      await axios.delete('http://127.0.0.1:4156/v1.1/media/'+play_list.data.media_play_list[1].unique, {})

      // send text value
      await setTimeout(async function(){
          await axios.post('http://127.0.0.1:4156/v1.1/plugin/params', {
              unique: 'name',
              params: [{
                  key: "text",
                  value: "正在播放: " + keyword,
              }]
          })
      },3000)

  } catch (error) {
    console.log("与kplayer接口调用失败： " + JSON.stringify(error.response.data));
  }
}

add_media("天堂");

new DanmakuService({
  roomId: 4936608
}).connect()
  .on('open', () => {
    console.log('正在连接至弹幕服务器')
  })
  .on('data', (msg) => {
    // msg结构参见下方文档说明
    if (msg.op === 'AUTH_REPLY') {
      console.log('成功连接至弹幕服务器')
    }else if(msg.op === 'SEND_SMS_REPLY'){
        if(msg.info === undefined)
            return;

        console.log('获取到弹幕：', msg.info[1]);

        const danmu_text = msg.info[1];
        var reg = /^\#点歌\s(.*)/

        // 解析弹幕
        const match_result = reg.exec(danmu_text);
        if(match_result.length == 1)
            return;

        const search_keyword = match_result[1].trim();
        add_media(search_keyword);
    } else {
      //console.log(msg)
    }
  })
  .on('close', () => {
    console.log('已断开与弹幕服务器的连接')
  })
  .on('error', () => {
    console.log('与弹幕服务器的连接出现错误')
  })
