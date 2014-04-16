package main

import (
	"github.com/sebkl/twitterstream"
	"log"
	"os"
	"encoding/json"
	"sync"
	"time"
	"container/list"
)

const (
	DefaultBufferSize = 12 //BitSize
)

type twitterConfiguration struct {
	APIKey string
	APISecret string
	AccessToken string
	AccessSecret string
}

type Message struct {
	Long float64 `json:"long"`
	Lat float64 `json:"lat"`
	Text string `json:"text"`
	Sender string `json:"sender"`
	Time uint64 `json:"time"`
	Dtime uint64 `json:"dtime"`
	Id uint64 `json:"id"`
}

type Buffer struct {
	cid uint64 //next free slot, last slot: buf[cid-1]
	buf []Message
	mutex sync.Mutex
	mask uint64
	size uint64
}

type TweetSession struct {
	Id int64
	Next uint64
	LastAccess int64
	Begin int64
}

type FetchRequest struct {
	id uint64
	s *TweetSession
	q chan []Message
	max uint64
}

func NewFetchRequest(s *TweetSession) *FetchRequest{
	return &FetchRequest{
		id: s.Next,
		s: s,
		max: 0,
		q: make(chan []Message) }
}

type Fetcher struct {
	config *twitterConfiguration
	client *twitterstream.Client
	buf *Buffer
	configFile *os.File
	backlog *list.List
	notify chan int
	running bool
	conn *twitterstream.Connection
}

func NewBuffer(bsize uint) (buf *Buffer){
	buf = new(Buffer)
	buf.cid = 0
	buf.size = 1 << (bsize)
	buf.buf = make([]Message,buf.size)
	buf.mask = 0

	for i := bsize;i > 0; i-- {
		buf.mask |= 1<<(i-1)
	}

	log.Printf("Initialized Buffer: %d/%x",buf.size,buf.mask)
	return
}

func NewFetcher(filename string) (ret *Fetcher,err error) {
	ret = &Fetcher{running: false}
	ret.buf = NewBuffer(DefaultBufferSize)
	ret.backlog = list.New()
	ret.notify = make(chan int)
	ret.configFile, err = os.Open(filename)
	decoder := json.NewDecoder(ret.configFile)
	ret.config = &twitterConfiguration{}
	decoder.Decode(ret.config)
	ret.client = twitterstream.NewClient(ret.config.APIKey,ret.config.APISecret,ret.config.AccessToken,ret.config.AccessSecret)
	//log.Printf("Using %s %s %s %s",ret.config.APIKey,ret.config.APISecret,ret.config.AccessToken,ret.config.AccessSecret)

	go func() {
		ret.BacklogRunner()
	}()

	return
}

func (b *Buffer) Empty() (*Buffer){
	b.cid =0
	b.buf = make([]Message,b.size)
	return b
}

func (b *Buffer) Enqueue(tweet *twitterstream.Tweet) (*Buffer){
	now := uint64(time.Now().UnixNano() / 1000)
	b.mutex.Lock()
	id := b.cid & b.mask
	ltime := now
	if (id > 0) {
		ltime = b.buf[id -1].Time
	}
	dtime := now - ltime

	if (tweet.Coordinates != nil) {
		b.buf[id] = Message{
			Long: float64(tweet.Coordinates.Long),
			Lat: float64(tweet.Coordinates.Lat),
			Text: tweet.Text,
			Time: now,
			Dtime: dtime,
			Id: b.cid,
			Sender: tweet.User.ScreenName }
		b.cid++
	} else if (tweet.Place != nil && tweet.Place != nil) {
		b.buf[id] = Message{
			Long: float64(tweet.Place.BoundingBox.Points[0].Long) ,
			Lat: float64(tweet.Place.BoundingBox.Points[0].Lat),
			Text: tweet.Text,
			Time: now,
			Dtime: dtime,
			Id: b.cid,
			Sender: tweet.User.ScreenName }
		b.cid++
	}
	b.mutex.Unlock()
	return b
}

func (b* Buffer) HasNext(id uint64) bool {
	return b.cid > id;
}

func (b* Buffer) Fetch(vals ...uint64) (ret []Message) {
	b.mutex.Lock()
	var id,max uint64
	id = 0
	max = 0

	if len(vals) > 0 {
		id = vals[0]
	}

	if len(vals) > 1 {
		max = vals[1]
	}

	if (b.cid == 0 || id > b.cid) {
		b.mutex.Unlock()
		return
	}

	cid := b.cid - 1

	if max > 0 && (id + max) < cid {
		cid = id + (max-1)
	}

	from := uint64(id & b.mask)
	to := uint64(cid & b.mask)
	diff := int64(cid) - int64(id)
	mdiff := (int64(from) - int64(to) )
	if (mdiff < 0) {
		mdiff = int64(to -from)
	}

	if (diff > mdiff) {
		from = to + 1
	}

	if (from > to && cid != 0) {
		a1 := uint(from)
		a2 := uint(b.size - 1)
		b1 := uint(0)
		b2 := uint(to)
		s := (b.size - from) + to + 1
		ret = make([]Message,s)

		copy(ret[0:(a2-a1) + 1],b.buf[a1:a2 + 1])
		copy(ret[(a2-a1) + 1:s],b.buf[b1:b2 + 1])
	} else {
		ret = b.buf[from:to + 1]
	}
	b.mutex.Unlock()
	return
}

func (f *Fetcher) Fetch(fr *FetchRequest) (ret []Message) {
	if f.buf.HasNext(fr.id) {
		ret = f.buf.Fetch(fr.id)
	} else {
		// Reduce offset to 1 in order to avoid future requests
		fr.id = f.buf.cid +1
		f.backlog.PushBack(fr)

		ret = <-fr.q
	}
	return
}

func (f* Fetcher) BacklogRunner() {
	log.Printf("Started BacklogRunner.")
	for c:=0;;c++ {
		<-f.notify
		for e := f.backlog.Front(); e != nil; e = e.Next() {
			fr, ok := e.Value.(*FetchRequest)
			if ok {
				if f.buf.HasNext(fr.id) {
					fr.q <- f.buf.Fetch(fr.id)
					f.backlog.Remove(e)
				}
			} else {
				log.Printf("Backlog contains invalid element type.")
				f.backlog.Remove(e)
			}
		}
	}
	log.Printf("BacklogRunner stopped")
}

func (f *Fetcher) Start() (err error) {
	f.conn,err = f.client.Locations(twitterstream.Point{-90.0,-180.0}, twitterstream.Point{90.0,180.0})
	if (err != nil) {
		return
	}
	f.running = true
	for ;f.running; {
		tweet,err := f.conn.Next()
		if (err == nil) {
			f.buf.Enqueue(tweet)
			f.notify<-1
		} else {
			log.Printf("Could not fetch next tweet from stream. %s",err)
		}
	}
	log.Printf("Stream has stopped.")
	f.buf.Empty()
	return
}

func (f *Fetcher) Stop() {
	if f.running {
		log.Printf("Stopping stream.")
		f.running = false
		f.conn.Close()
	}
}




