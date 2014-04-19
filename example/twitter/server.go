package main

import (
	. "github.com/sebkl/gotojs"
	"log"
	"fmt"
	"time"
	"math/rand"
	"strconv"
	"os"
	"encoding/json"
)

const (
	DefaultSessionTimeout = 30 //in seconds
	DefaultMaxRecordCount = 10000 //in count of tweets
)

type Configuration struct {
	SessionTimeout int
	MaxRecordCount int
	BufferBitSize int
}

type Tweets struct {
	sessions map[int64]*TweetSession
	fetcher *Fetcher
	config Configuration
}

func (t *Tweets) session(session *Session) (s *TweetSession) {
	id,_ := strconv.ParseInt(session.Get("ID"),10,64)

	if _,ok := t.sessions[id]; !ok {
		nid := rand.Int63()
		s = &TweetSession{
			Id: nid,
			Next: t.fetcher.buf.cid,
			Begin: time.Now().UnixNano() / 1000}
		session.Set("ID",fmt.Sprintf("%d",fmt.Sprintf("%d",nid)))
		log.Printf("Created with session with id: %d", nid)
		t.sessions[id] = s
	} else {
		s = t.sessions[id]
	}
	return s
}

func (t *Tweets) Next(session *Session) (ret []Message) {
	t.lazyStart()
	s := t.session(session)
	fr := NewFetchRequest(s)
	fr.max = uint64(t.config.MaxRecordCount)
	ret = t.fetcher.Fetch(fr)

	s.Next = ret[len(ret) -1].Id + 1 // Update id
	s.LastAccess = time.Now().UnixNano() / 1000

	return
}

func (t* Tweets) Reset(session *Session) {
	s := t.session(session)
	delete(t.sessions,s.Id)
}

// lazyStart checks whether the fetcher is currently running. If yes it returns immediately.
// If not it is started. This mechanism allows to stop twitter source stream if no scubscribers
// or sessions are currently open.
func (t* Tweets) lazyStart() {
	if t.fetcher.running {
		return
	} else {
		go func() {
			log.Printf("Starting twitterstream process.")
			t.fetcher.Start()
		}()
	}
}

func (t* Tweets) cleanup() {
	log.Printf("Performing cleanup")
	now := time.Now().UnixNano() / 1000
	for k,v := range t.sessions {
		dts := (now - v.LastAccess) / 1000000
		if dts > int64(t.config.SessionTimeout) {
			log.Printf("Killing session: %d, Timedout since %d seconds.",v.Id,dts)
			delete(t.sessions,k)
		}
	}

	if len(t.sessions) < 1 {
		t.fetcher.Stop()
	}
	log.Printf("Cleanup done.")
}

func (f* Tweets) cleanupRunner() {
	for ;; {
		time.Sleep(10 * time.Second)
		f.cleanup()
		log.Printf("Buffer[size: %d, cid: %d, sessions: %d]",f.fetcher.buf.size,f.fetcher.buf.cid,len(f.sessions))
	}
	log.Printf("CleanupRunner stopped")
}

func NewTweets() (t* Tweets,err error) {
	fetcher,err := NewFetcher("twitter_account.json")

	t = &Tweets{	fetcher: fetcher,
			config: Configuration{	SessionTimeout: DefaultSessionTimeout,
						MaxRecordCount: DefaultMaxRecordCount,
						BufferBitSize: DefaultBufferSize },
			sessions: make(map[int64]*TweetSession)}
	filename := "config.json"
	configFile, oerr := os.Open(filename)
	if (oerr == nil) {
		log.Printf("Loading configuration from %s",filename)
		decoder := json.NewDecoder(configFile)
		decoder.Decode(t.config)
	} else {
		log.Printf("Could not load configiguration from %s",filename)
	}
	return
}

func main() {
	tweets,err := NewTweets()
	if (err != nil) {
		log.Fatal(err)
	}
	server := NewFrontend()
	server.EnableFileServer("htdocs","p")
	server.Redirect("/","/p/")
	//server.ExposeMethods(tweets,"Next")
	server.ExposeInterface(tweets)
	server.ExposeYourself()

	go func() {
		log.Printf("Starting cleanup process.")
		tweets.cleanupRunner()
	}()

	log.Fatal(server.Start(":8888"))
}

