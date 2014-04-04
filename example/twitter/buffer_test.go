package main

import(
	"github.com/sebkl/twitterstream"
	"testing"
	"container/list"
	"log"
	"encoding/json"
)

var b *Buffer

func testTweet() (ret *twitterstream.Tweet) {
	ret = &twitterstream.Tweet{
		Coordinates: &twitterstream.Point{20.5,45.1},
		Text: "Test Tweet",
		User: twitterstream.User{ScreenName: "TestScreenName"},
	}
	return
}

func TestInitBuffer(t *testing.T) {
	s := uint(2)
	b = NewBuffer(s)
	if (b.size != 1 << s) {
		t.Errorf("Buffer size not correctly computed: %d/%d",b.size,1 << s)
	}
}

func TestBufferFill(t *testing.T) {
	for i:=0; i < 20;i++ {
		b.Enqueue(testTweet())
	}

	if (b.cid != 20) {
		t.Errorf("CID not properly incremented: %d/%d",b.cid,20)
	}
}

func TestBufferFetch(t *testing.T) {
	b.Empty()
	if len(b.Fetch(0)) != 0 {
		t.Errorf("Empty buffer fetch should return empty slice: %d", len(b.Fetch(0)))
	}

	b.Enqueue(testTweet())
	for i:= 0; i < 10; i++ {
		mb := b.Fetch(0)
		l := len(mb)
		if l != int(b.size) && uint64(l) != b.cid {
			t.Errorf("Not all available entries returned: %d/%d",l,b.size)
		}

		if mb[0].Id > mb[l - 1].Id {
			t.Errorf("Invalid order of ids in Fetch result: %d >= %d",mb[0].Id,mb[l - 1].Id)
		}

		sb := b.Fetch(mb[0].Id)
		for x:=0; x < l; x++ {
			if sb[x].Id != mb[x].Id {
				t.Errorf("Specific Fetch does not equal complete Fetch: [%d] %d != %d",x,sb[x].Id,mb[x].Id)
			}
		}

		//t.Logf("id %d ... %d",mb[0].id,mb[l -1].id)
		b.Enqueue(testTweet())
	}
}

func TestBufferFetchSequence(t *testing.T) {
	b.Empty()
	id := uint64(0)
	for i:=0;i < 20; i++ {
		for x:=0;x<=i;x++ {
			b.Enqueue(testTweet())
		}
		mes := b.Fetch(id)
		id = mes[len(mes) - 1].Id + 1

	}

	if id != b.cid {
		t.Errorf("Sequence broken: %d/%d",id,b.cid)
	}
}

func TestMessageJsonEncodung(t *testing.T) {
	b.Empty()
	b.Enqueue(testTweet())
	m := b.Fetch(0)
	mes,_ := json.Marshal(m[0])
	if len(mes) < 10 {
		t.Errorf("Message not properly json enoded.")
	}
}

func TestBufferLimits(t *testing.T) {
	b.Empty()
	for  i:=0;i < 4;i++ {
		b.Enqueue(testTweet())
	}
	limit := uint64(2)
	m := b.Fetch(0,limit)
	if uint64(len(m)) != limit {
		t.Errorf("Buffer limit failed: %d/%d",len(m),limit)
	}
}

func newTestFetcher() (ret *Fetcher) {
	 ret = &Fetcher{
		buf: NewBuffer(8),
		backlog: list.New(),
		notify: make(chan int,100),
	}
	return
}

func BenchmarkBuffer (b *testing.B) {
	fetcher := newTestFetcher()

	//Consumer 
	go fetcher.BacklogRunner()

	// Producer
	go func() {
		for i:=0; i<b.N; i++  {
			fetcher.buf.Enqueue(testTweet())
			fetcher.notify<-1
		}
	}()

	done := make(chan int)
	b.ResetTimer() //Start measuring
	pc := 2
	for p:=0; p<pc; p++ {
		go func(p int) {
			id := uint64(0)
			for ;id < uint64(b.N);  {
				fr := NewFetchRequest(&TweetSession{Next: id})
				mes := fetcher.Fetch(fr)
				if mes[0].Id != id {
					b.Logf("#%d Leak detected %d %d",p,mes[0].Id,id)
				}
				id = mes[len(mes) - 1].Id + 1
			}
			log.Printf("Final: %d",id)
			done <- 1
		}(p)
	}


	for p:=0;p<pc;p++ {
		<-done
	}
}

