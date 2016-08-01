package main

import (
	"fmt"
	. "github.com/sebkl/gotojs"
	"io/ioutil"
	"net/http"
	"os"
)

func main() {
	bytes, err := ioutil.ReadAll(os.Stdin)
	if err != nil {
		panic(err)
	}
	fmt.Println(string(Minify(http.DefaultClient, bytes)))
}
