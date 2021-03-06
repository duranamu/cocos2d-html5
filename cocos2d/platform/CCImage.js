/****************************************************************************
 Copyright (c) 2010-2012 cocos2d-x.org
 Copyright (c) 2008-2010 Ricardo Quesada
 Copyright (c) 2011      Zynga Inc.

 http://www.cocos2d-x.org

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated documentation files (the "Software"), to deal
 in the Software without restriction, including without limitation the rights
 to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 copies of the Software, and to permit persons to whom the Software is
 furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in
 all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 THE SOFTWARE.
 ****************************************************************************/
var cc = cc = cc || {};

cc.kFmtJpg = 0;
cc.kFmtPng = 1;
cc.kFmtRawData = 2;
cc.kFmtUnKnown = 3;

cc.kAlignCenter = 0x33; ///< Horizontal center and vertical center.
cc.kAlignTop = 0x13; ///< Horizontal center and vertical top.
cc.kAlignTopRight = 0x12; ///< Horizontal right and vertical top.
cc.kAlignRight = 0x32; ///< Horizontal right and vertical center.
cc.kAlignBottomRight = 0x22; ///< Horizontal right and vertical bottom.
cc.kAlignBottom = 0x23; ///< Horizontal center and vertical bottom.
cc.kAlignBottomLeft = 0x21; ///< Horizontal left and vertical bottom.
cc.kAlignLeft = 0x31; ///< Horizontal left and vertical center.
cc.kAlignTopLeft = 0x11; ///< Horizontal left and vertical top.

function cc.RGB_PREMULTIPLY_APLHA(vr, vg, vb, va) {
    return ((vr * (va + 1)) >> 8) | ((vg * (va + 1) >> 8) << 8) | ((vb * (va + 1) >> 8) << 16) | ((va) << 24)
}

function tImageSource(data, size, offset) {
    this.data = data;
    this.size = size;
    this.offset = offset;
}

cc.pngReadCallback = function (png_ptr, data, length) {
    var isource = new tImageSource();
    isource = cc.png_get_io_ptr(png_ptr);

    if (isource.offset + length <= isource.size) {
        cc.memcpy(data, isource.data + isource.offset, length);
        isource.offset += length;
    }
    else {
        cc.png_error(png_ptr, "pngReaderCallback failed");
    }
};

cc.Image = cc.Class.extend({
    _m_nWidth:0,
    _m_nHeight:0,
    _m_nBitsPerComponent:0,
    _m_pData:0,
    _m_bHasAlpha:false,
    _m_bPreMulti:false,

    /**
     @brief  Load the image from the specified path.
     @param strPath   the absolute file path
     @param imageType the type of image, now only support tow types.
     @return  true if load correctly
     */
    initWithImageFile:function (strPath, eImgFmt) {
        cc.UNUSED_PARAM(eImgFmt);
        var data = new cc.FileData(cc.FileUtils.fullPathFromRelativePath(strPath), "rb");
        return this.initWithImageData(data.getBuffer(), data.getSize(), eImgFmt);
    },

    /*
     @brief The same meaning as initWithImageFile, but it is thread safe. It is casued by
     loadImage() in CCTextureCache.cpp.
     @param fullpath  full path of the file
     @param imageType the type of image, now only support tow types.
     @return  true if load correctly
     */
    initWithImageFileThreadSafe:function (fullpath, imageType) {
        cc.UNUSED_PARAM(imageType);
        var data = new cc.FileData(fullpath, "rb");
        return this.initWithImageData(data.getBuffer(), data.getSize(), imageType);
    },

    /**
     @brief  Load image from stream buffer.

     @warning kFmtRawData only support RGBA8888
     @param pBuffer  stream buffer that hold the image data
     @param nLength  the length of data(managed in byte)
     @param nWidth, nHeight, nBitsPerComponent are used for kFmtRawData
     @return true if load correctly
     */
    initWithImageData:function (pData, nDataLen, eFmt, nWidth, nHeight, nBitsPerComponent) {
        var bRet = false;
        do
        {
            if (!pData || nDataLen <= 0) break;

            if (cc.kFmtPng == eFmt) {
                bRet = this._initWithPngData(pData, nDataLen);
                break;
            }
            else if (cc.kFmtJpg == eFmt) {
                bRet = this._initWithJpgData(pData, nDataLen);
                break;
            }
            else if (cc.kFmtRawData == eFmt) {
                bRet = this._initWithRawData(pData, nDataLen, nWidth, nHeight, nBitsPerComponent);
                break;
            }
        } while (0);
        return bRet;
    },
    getData:function () {
        return this._m_pData;
    },
    getDataLen:function () {
        return this._m_nWidth * this._m_nHeight;
    },
    hasAlpha:function () {
        return this._m_bHasAlpha;
    },
    isPremultipliedAlpha:function () {
        return this._m_bPreMulti;
    },
    getWidth:function () {
        return this._m_nWidth;
    },
    getHeight:function () {
        return this._m_nHeight;
    },
    getBitsPerComponent:function () {
        return this._m_nBitsPerComponent;
    },
    /**
     @brief    Save the CCImage data to specified file with specified format.
     @param    pszFilePath        the file's absolute path, including file subfix
     @param    bIsToRGB        if the image is saved as RGB format
     */
    saveToFile:function (pszFilePath, bIsToRGB) {
        var bRet = false;
        do
        {
            if (null == pszFilePath) break;

            var strFilePath = pszFilePath;
            if (strFilePath.size() <= 4) break;
            var strLowerCasePath = strFilePath;
            for (var i = 0; i < strLowerCasePath.length(); ++i) {
                strLowerCasePath[i] = cc.tolower(strFilePath[i]);
            }

            if (std.string.npos != strLowerCasePath.find(".png")) {
                if (!this._saveImageToPNG(pszFilePath, bIsToRGB)) break;
            }
            else if (std.string.npos != strLowerCasePath.find(".jpg")) {
                if (!this._saveImageToJPG(pszFilePath)) break;
            }
            else {
                break;
            }

            bRet = true;
        } while (0);

        return bRet;
    },

    /*protected:*/
    _initWithJpgData:function (data, nSize) {
        /* these are standard libjpeg structures for reading(decompression) */
        var cinfo = new cc.jpeg_decompress_struct();
        var jerr = new cc.jpeg_error_mgr();
        /* libjpeg data structure for storing one row, that is, scanline of an image */
        var row_pointer = [0];
        var location = 0;
        var i = 0;

        var bRet = false;
        do
        {
            /* here we set up the standard libjpeg error handler */
            cinfo.err = cc.jpeg_std_error(jerr);

            /* setup decompression process and source, then read JPEG header */
            cc.jpeg_create_decompress(cinfo);

            cc.jpeg_mem_src(cinfo, data, nSize);

            /* reading the image header which contains image information */
            cc.jpeg_read_header(cinfo, true);

            // we only support RGB or grayscale
            if (cinfo.jpeg_color_space != cc.JCS_RGB) {
                if (cinfo.jpeg_color_space == cc.JCS_GRAYSCALE || cinfo.jpeg_color_space == cc.JCS_YCbCr) {
                    cinfo.out_color_space = cc.JCS_RGB;
                }
            }
            else {
                break;
            }

            /* Start decompression jpeg here */
            cc.jpeg_start_decompress(cinfo);

            /* init image info */
            this._m_nWidth = cinfo.image_width;
            this._m_nHeight = cinfo.image_height;
            this._m_bHasAlpha = false;
            this._m_bPreMulti = false;
            this._m_nBitsPerComponent = 8;
            row_pointer[0] = new [cinfo.output_width * cinfo.output_components];
            if (!row_pointer[0]) break;
            this._m_pData = new [cinfo.output_width * cinfo.output_height * cinfo.output_components];
            if (!this._m_pData) break;

            /* now actually read the jpeg into the raw buffer */
            /* read one scan line at a time */
            while (cinfo.output_scanline < cinfo.image_height) {
                cc.jpeg_read_scanlines(cinfo, row_pointer, 1);
                for (i = 0; i < cinfo.image_width * cinfo.num_components; i++)
                    this._m_pData[location++] = row_pointer[0][i];
            }

            cc.jpeg_finish_decompress(cinfo);
            cc.jpeg_destroy_decompress(cinfo);
            /* wrap up decompression, destroy objects, free pointers and close open files */
            bRet = true;
        } while (0);

        return bRet;
    },
    _initWithPngData:function (pData, nDatalen) {
        var bRet = false, header = [0], png_ptr = 0, info_ptr = 0, pImateData = 0;

        do
        {
            // png header len is 8 bytes
            if (nDatalen < 8) break;
            // check the data is png or not
            cc.memcpy(header, pData, 8);
            if (cc.png_sig_cmp(header, 0, 8)) break;

            // init png_struct
            png_ptr = cc.png_create_read_struct(cc.PNG_LIBPNG_VER_STRING, 0, 0, 0);
            if (!png_ptr) break;
            // init png_info
            info_ptr = cc.png_create_info_struct(png_ptr);
            if (!info_ptr) break;

            // set the read call back function
            var imageSource = new tImageSource();
            imageSource.data = pData;
            imageSource.size = nDatalen;
            imageSource.offset = 0;
            cc.png_set_read_fn(png_ptr, imageSource, cc.pngReadCallback);

            // read png
            // PNG_TRANSFORM_EXPAND: perform set_expand()
            // PNG_TRANSFORM_PACKING: expand 1, 2 and 4-bit samples to bytes
            // PNG_TRANSFORM_STRIP_16: strip 16-bit samples to 8 bits
            // PNG_TRANSFORM_GRAY_TO_RGB: expand grayscale samples to RGB (or GA to RGBA)
            cc.png_read_png(png_ptr, info_ptr, cc.PNG_TRANSFORM_EXPAND | cc.PNG_TRANSFORM_PACKING
                | cc.PNG_TRANSFORM_STRIP_16 | cc.PNG_TRANSFORM_GRAY_TO_RGB, 0);

            var color_type = 0;
            var nWidth = 0;
            var nHeight = 0;
            var nBitsPerComponent = 0;
            cc.png_get_IHDR(png_ptr, info_ptr, nWidth, nHeight, nBitsPerComponent, color_type, 0, 0, 0);

            // init image info
            this._m_bPreMulti = true;
            this._m_bHasAlpha = ( info_ptr.color_type & cc.PNG_COLOR_MASK_ALPHA ) ? true : false;

            // allocate memory and read data
            var bytesPerComponent = 3;
            if (this._m_bHasAlpha) {
                bytesPerComponent = 4;
            }
            pImateData = new [nHeight * nWidth * bytesPerComponent];
            if (!pImateData) break;
            var rowPointers = new cc.png_bytep();
            rowPointers = cc.png_get_rows(png_ptr, info_ptr);

            // copy data to image info
            var bytesPerRow = nWidth * bytesPerComponent;
            if (this._m_bHasAlpha) {
                var tmp = pImateData;
                for (var i = 0; i < nHeight; i++) {
                    for (var j = 0; j < bytesPerRow; j += 4) {
                        tmp++;
                        tmp = cc.RGB_PREMULTIPLY_APLHA(rowPointers[i][j], rowPointers[i][j + 1],
                            rowPointers[i][j + 2], rowPointers[i][j + 3]);
                    }
                }
            }
            else {
                for (var j = 0; j < nHeight; ++j) {
                    cc.memcpy(pImateData + j * bytesPerRow, rowPointers[j], bytesPerRow);
                }
            }

            this._m_nBitsPerComponent = nBitsPerComponent;
            this._m_nHeight = nHeight;
            this._m_nWidth = nWidth;
            this._m_pData = pImateData;
            pImateData = 0;
            bRet = true;
        } while (0);

        if (png_ptr) {
            cc.png_destroy_read_struct(png_ptr, info_ptr ? info_ptr : 0, 0);
        }
        return bRet;
    },

// @warning kFmtRawData only support RGBA8888
    _initWithRawData:function (pData, nDatalen, nWidth, nHeight, nBitsPerComponent) {
        var bRet = false;
        do
        {
            if (0 == nWidth || 0 == nHeight) break;

            this._m_nBitsPerComponent = nBitsPerComponent;
            this._m_nHeight = nHeight;
            this._m_nWidth = nWidth;
            this._m_bHasAlpha = true;

            // only RGBA8888 surported
            var nBytesPerComponent = 4;
            var nSize = nHeight * nWidth * nBytesPerComponent;
            this._m_pData = new [nSize];
            if (!this._m_pData) break;
            cc.memcpy(this._m_pData, pData, nSize);

            bRet = true;
        } while (0);
        return bRet;
    },

    _saveImageToPNG:function (pszFilePath, bIsToRGB) {
        var bRet = false;
        do
        {
            if (null == pszFilePath) break;

            var fp = new cc.FILE(), png_ptr = new cc.png_structp(), info_ptr = new cc.png_infop(), palette = new cc.png_colorp(), row_pointers = new cc.png_bytep();

            fp = cc.fopen(pszFilePath, "wb");
            if (null == fp) break;

            png_ptr = cc.png_create_write_struct(cc.PNG_LIBPNG_VER_STRING, null, null, null);

            if (null == png_ptr) {
                cc.fclose(fp);
                break;
            }

            info_ptr = cc.png_create_info_struct(png_ptr);
            if (null == info_ptr) {
                cc.fclose(fp);
                cc.png_destroy_write_struct(png_ptr, null);
                break;
            }
            if (cc.TARGET_PLATFORM != cc.PLATFORM_BADA) {
                if (cc.setjmp(cc.png_jmpbuf(png_ptr))) {
                    cc.fclose(fp);
                    cc.png_destroy_write_struct(png_ptr, info_ptr);
                    break;
                }
            }
            cc.png_init_io(png_ptr, fp);

            if (!bIsToRGB && this._m_bHasAlpha) {
                cc.png_set_IHDR(png_ptr, info_ptr, this._m_nWidth, this._m_nHeight, 8, cc.PNG_COLOR_TYPE_RGB_ALPHA,
                    cc.PNG_INTERLACE_NONE, cc.PNG_COMPRESSION_TYPE_BASE, cc.PNG_FILTER_TYPE_BASE);
            }
            else {
                cc.png_set_IHDR(png_ptr, info_ptr, this._m_nWidth, this._m_nHeight, 8, cc.PNG_COLOR_TYPE_RGB,
                    cc.PNG_INTERLACE_NONE, cc.PNG_COMPRESSION_TYPE_BASE, cc.PNG_FILTER_TYPE_BASE);
            }

            palette = cc.png_malloc(png_ptr, cc.PNG_MAX_PALETTE_LENGTH * sizeof(cc.png_color));
            cc.png_set_PLTE(png_ptr, info_ptr, palette, cc.PNG_MAX_PALETTE_LENGTH);

            cc.png_write_info(png_ptr, info_ptr);

            cc.png_set_packing(png_ptr);

            row_pointers = cc.malloc(this._m_nHeight * sizeof(cc.png_bytep));
            if (row_pointers == null) {
                cc.fclose(fp);
                cc.png_destroy_write_struct(png_ptr, info_ptr);
                break;
            }

            if (!this._m_bHasAlpha) {
                for (var i = 0; i < this._m_nHeight; i++) {
                    row_pointers[i] = this._m_pData + i * this._m_nWidth * 3;
                }

                cc.png_write_image(png_ptr, row_pointers);

                cc.free(row_pointers);
                row_pointers = null;
            }
            else {
                if (bIsToRGB) {
                    var pTempData = new [this._m_nWidth * this._m_nHeight * 3];
                    if (null == pTempData) {
                        cc.fclose(fp);
                        cc.png_destroy_write_struct(png_ptr, info_ptr);
                        break;
                    }

                    for (var i = 0; i < this._m_nHeight; ++i) {
                        for (var j = 0; j < this._m_nWidth; ++j) {
                            pTempData[(i * this._m_nWidth + j) * 3] = this._m_pData[(i * __m_nWidth + j) * 4];
                            pTempData[(i * this._m_nWidth + j) * 3 + 1] = this._m_pData[(i * __m_nWidth + j) * 4 + 1];
                            pTempData[(i * this._m_nWidth + j) * 3 + 2] = this._m_pData[(i * __m_nWidth + j) * 4 + 2];
                        }
                    }

                    for (var i = 0; i < this._m_nHeight; i++) {
                        row_pointers[i] = pTempData + i * this._m_nWidth * 3;
                    }

                    cc.png_write_image(png_ptr, row_pointers);

                    cc.free(row_pointers);
                    row_pointers = null;

                }
                else {
                    for (var i = 0; i < this._m_nHeight; i++) {
                        row_pointers[i] = this._m_pData + i * this._m_nWidth * 4;
                    }

                    cc.png_write_image(png_ptr, row_pointers);

                    cc, free(row_pointers);
                    row_pointers = null;
                }
            }

            cc.png_write_end(png_ptr, info_ptr);

            cc.png_free(png_ptr, palette);
            palette = null;

            cc.png_destroy_write_struct(png_ptr, info_ptr);

            cc.fclose(fp);

            bRet = true;
        } while (0);
        return bRet;
    },
    _saveImageToJPG:function (pszFilePath) {
        var bRet = false;
        do
        {
            if (null == pszFilePath) break;
            var cinfo = new cc.jpeg_compress_struct(),
                jerr = new cc.jpeg_error_mgr(),
                outfile = new cc.FILE(), /* target file */
                row_pointer = [], /* pointer to JSAMPLE row[s] */
                row_stride;
            /* physical row width in image buffer */

            cinfo.err = jpeg_std_error(jerr);
            /* Now we can initialize the JPEG compression object. */
            cc.jpeg_create_compress(cinfo);

            if ((outfile = fopen(pszFilePath, "wb")) == null) break;

            cc.jpeg_stdio_dest(cinfo, outfile);

            cinfo.image_width = this._m_nWidth;
            /* image width and height, in pixels */
            cinfo.image_height = this._m_nHeight;
            cinfo.input_components = 3;
            /* # of color components per pixel */
            cinfo.in_color_space = cc.JCS_RGB;
            /* colorspace of input image */

            cc.jpeg_set_defaults(cinfo);

            cc.jpeg_start_compress(cinfo, true);

            row_stride = this._m_nWidth * 3;
            /* JSAMPLEs per row in image_buffer */

            if (this._m_bHasAlpha) {
                var pTempData = new [this._m_nWidth * this._m_nHeight * 3];
                if (null == pTempData) {
                    cc.jpeg_finish_compress(cinfo);
                    cc.jpeg_destroy_compress(cinfo);
                    cc.fclose(outfile);
                    break;
                }

                for (var i = 0; i < this._m_nHeight; ++i) {
                    for (var j = 0; j < this._m_nWidth; ++j) {
                        pTempData[(i * this._m_nWidth + j) * 3] = this._m_pData[(i * this._m_nWidth + j) * 4];
                        pTempData[(i * this._m_nWidth + j) * 3 + 1] = this._m_pData[(i * this._m_nWidth + j) * 4 + 1];
                        pTempData[(i * this._m_nWidth + j) * 3 + 2] = this._m_pData[(i * this._m_nWidth + j) * 4 + 2];
                    }
                }

                while (cinfo.next_scanline < cinfo.image_height) {
                    row_pointer[0] = pTempData[cinfo.next_scanline * row_stride];
                    cc.jpeg_write_scanlines(cinfo, row_pointer, 1);
                }

            }
            else {
                while (cinfo.next_scanline < cinfo.image_height) {
                    row_pointer[0] = this._m_pData[cinfo.next_scanline * row_stride];
                    cc.jpeg_write_scanlines(cinfo, row_pointer, 1);
                }
            }

            cc.jpeg_finish_compress(cinfo);
            cc.fclose(outfile);
            cc.jpeg_destroy_compress(cinfo);

            bRet = true;
        } while (0);
        return bRet;
    },

    /**
     @brief    Create image with specified string.
     @param  pText       the text which the image show, nil cause init fail
     @param  nWidth      the image width, if 0, the width match the text's width
     @param  nHeight     the image height, if 0, the height match the text's height
     @param  eAlignMask  the test Alignment
     @param  pFontName   the name of the font which use to draw the text. If nil, use the default system font.
     @param  nSize       the font size, if 0, use the system default size.
     */
    initWithString:function (pText, nWidth, nHeight, eAlignMask, pFontName, nSize) {

    }
});